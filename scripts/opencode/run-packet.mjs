import fs from "node:fs";
import path from "node:path";
import {
  buildClient,
  parseArgs,
  readUtf8,
  writeJson,
  extractPacketId,
  normalizeAssistantTextFromV1,
  normalizeAssistantTextFromV2,
  getArtifactsDir,
  validateExecutorResponseSchema,
} from "./common.mjs";

function usage() {
  console.error([
    "Usage:",
    "  node scripts/opencode/run-packet.mjs --packet <file> [--session <ses_id>] [--mode v1|auto|v2] [--agent build] [--provider <id>] [--model <id>] [--variant <id>]",
    "",
    "Environment variables:",
    "  OPENCODE_USER (required)",
    "  OPENCODE_PASS (required)",
    "  OPENCODE_BASE_URL (optional, defaults to http://100.80.45.13:4096)",
  ].join("\n"));
}

function buildPrompt(packetText) {
  return [
    "You are the executor model for ByteForge.",
    "Read and follow the packet exactly.",
    "You must output exactly one YAML document.",
    "Do not include prose before or after YAML.",
    "Do not include markdown fences.",
    "If the packet is incomplete or ambiguous, output the failure schema YAML only.",
    "",
    "Execution packet:",
    packetText,
  ].join("\n");
}

function isTimeoutError(error) {
  const message = error && error.message ? String(error.message) : String(error || "");
  return message.includes("Request timed out after");
}

async function readAssistantFromSession(client, sessionID) {
  let messagesResponse;
  try {
    messagesResponse = await client.request("GET", `/api/session/${sessionID}/message?order=asc&limit=50`);
  } catch {
    return null;
  }

  if (!messagesResponse.ok) {
    return null;
  }

  const assistantText = normalizeAssistantTextFromV2(messagesResponse.data);
  if (!assistantText || !assistantText.trim()) {
    return null;
  }

  return {
    transport: "v1-recovered",
    assistantText,
    raw: messagesResponse.data,
  };
}

async function recoverAfterTimeout(client, sessionID) {
  const totalWaitMsRaw = Number.parseInt(String(process.env.OPENCODE_RECOVERY_WAIT_MS || "240000"), 10);
  const pollMsRaw = Number.parseInt(String(process.env.OPENCODE_RECOVERY_POLL_MS || "2000"), 10);

  const totalWaitMs = Number.isFinite(totalWaitMsRaw) && totalWaitMsRaw > 0 ? totalWaitMsRaw : 240000;
  const pollMs = Number.isFinite(pollMsRaw) && pollMsRaw > 0 ? pollMsRaw : 2000;
  const deadline = Date.now() + totalWaitMs;

  while (Date.now() < deadline) {
    const recovered = await readAssistantFromSession(client, sessionID);
    if (recovered) {
      return recovered;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`v1 timeout recovery exceeded ${totalWaitMs}ms with no assistant response in session history`);
}

async function recoverAfterEmptyResponse(client, sessionID) {
  console.error(`warning: empty assistant payload; attempting session-history recovery for ${sessionID}`);
  return recoverAfterTimeout(client, sessionID);
}

async function createSession(client, args) {
  if (args.session) {
    return args.session;
  }

  const payload = {
    title: args.title || "orchestrator-executor-packet",
  };

  if (args.agent) {
    payload.agent = args.agent;
  }

  if (args.provider && args.model) {
    payload.model = {
      id: args.model,
      providerID: args.provider,
    };
  }

  const created = await client.request("POST", "/session", payload);
  if (!created.ok || !created.data?.id) {
    throw new Error(`Unable to create session: status=${created.status} body=${JSON.stringify(created.data)}`);
  }

  return created.data.id;
}

async function tryV2(client, sessionID, promptText) {
  const promptResponse = await client.request("POST", `/api/session/${sessionID}/prompt`, {
    prompt: {
      text: promptText,
    },
    delivery: "deferred",
  });

  if (!promptResponse.ok) {
    return {
      ok: false,
      status: promptResponse.status,
      data: promptResponse.data,
    };
  }

  const waitResponse = await client.request("POST", `/api/session/${sessionID}/wait`, {});
  if (!waitResponse.ok && waitResponse.status !== 204) {
    return {
      ok: false,
      status: waitResponse.status,
      data: waitResponse.data,
    };
  }

  const messagesResponse = await client.request("GET", `/api/session/${sessionID}/message?order=asc&limit=50`);
  if (!messagesResponse.ok) {
    return {
      ok: false,
      status: messagesResponse.status,
      data: messagesResponse.data,
    };
  }

  const assistantText = normalizeAssistantTextFromV2(messagesResponse.data);
  return {
    ok: true,
    transport: "v2",
    assistantText,
    raw: messagesResponse.data,
  };
}

async function runV1(client, sessionID, promptText, args) {
  const payload = {
    parts: [
      {
        type: "text",
        text: promptText,
      },
    ],
  };

  if (args.agent) {
    payload.agent = args.agent;
  }

  if (args.provider && args.model) {
    payload.model = {
      providerID: args.provider,
      modelID: args.model,
    };
  }

  try {
    const response = await client.request("POST", `/session/${sessionID}/message`, payload);
    if (!response.ok) {
      throw new Error(`v1 prompt failed: status=${response.status} body=${JSON.stringify(response.data)}`);
    }

    const assistantText = normalizeAssistantTextFromV1(response.data);
    if (!assistantText || !assistantText.trim()) {
      return recoverAfterEmptyResponse(client, sessionID);
    }

    return {
      transport: "v1",
      assistantText,
      raw: response.data,
    };
  } catch (error) {
    if (!isTimeoutError(error)) {
      throw error;
    }

    console.error(`warning: v1 prompt timed out; attempting session-history recovery for ${sessionID}`);
    return recoverAfterTimeout(client, sessionID);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.packet) {
    usage();
    process.exit(1);
  }

  const packetPath = path.resolve(process.cwd(), String(args.packet));
  const packetText = readUtf8(packetPath);
  const packetID = extractPacketId(packetText, "packet");
  const promptText = buildPrompt(packetText);

  const client = buildClient();
  const sessionID = await createSession(client, args);
  console.error(`session_id=${sessionID} packet_id=${packetID}`);

  let result;
  const mode = (args.mode || "v1").toLowerCase();

  if (mode === "v2" || mode === "auto") {
    const v2 = await tryV2(client, sessionID, promptText);
    if (v2.ok) {
      result = v2;
    } else if (mode === "v2") {
      throw new Error(`v2 mode failed: status=${v2.status} body=${JSON.stringify(v2.data)}`);
    }
  }

  if (!result) {
    result = await runV1(client, sessionID, promptText, args);
  }

  if (!result.assistantText || !result.assistantText.trim()) {
    throw new Error(`No assistant payload available for session ${sessionID}`);
  }

  const validation = validateExecutorResponseSchema(result.assistantText);
  if (!validation.valid) {
    throw new Error(`Recovered assistant payload failed schema validation: ${validation.issues.join("; ")}`);
  }

  const output = {
    ok: true,
    sessionID,
    transport: result.transport,
    packetID,
    provider: args.provider ? String(args.provider) : null,
    model: args.model ? String(args.model) : null,
    variant: args.variant ? String(args.variant) : null,
    assistantText: result.assistantText,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactPath = path.resolve(
    process.cwd(),
    "storage/opencode-runs",
    `${timestamp}-${packetID}.json`,
  );

  writeJson(artifactPath, {
    ...output,
    packetPath,
    raw: result.raw,
  });

  const latestPointer = path.resolve(getArtifactsDir(), ".latest");
  fs.writeFileSync(latestPointer, `${artifactPath}\n`, "utf8");

  output.artifactPath = artifactPath;
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message || String(error),
  }, null, 2));
  process.exit(1);
});
