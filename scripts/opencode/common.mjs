import fs from "node:fs";
import path from "node:path";

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildClient() {
  const baseUrl = (process.env.OPENCODE_BASE_URL || "http://100.80.45.13:4096").replace(/\/$/, "");
  const username = requireEnv("OPENCODE_USER");
  const password = requireEnv("OPENCODE_PASS");
  const auth = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  async function request(method, endpoint, body) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  return {
    baseUrl,
    request,
  };
}

export function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function extractPacketId(packetText, fallback = "packet") {
  const match = packetText.match(/packet_id:\s*([A-Za-z0-9._-]+)/);
  return match ? match[1] : fallback;
}

export function normalizeAssistantTextFromV1(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  const chunks = parts
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean);
  return stripCodeFence(chunks.join("\n\n"));
}

export function normalizeAssistantTextFromV2(messages) {
  const items = Array.isArray(messages?.items) ? messages.items : [];
  const assistant = items.filter((item) => item && item.type === "assistant");
  if (assistant.length === 0) {
    return "";
  }

  const latest = assistant[assistant.length - 1];
  const content = Array.isArray(latest.content) ? latest.content : [];
  const chunks = content
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean);

  return stripCodeFence(chunks.join("\n\n"));
}

export function stripCodeFence(text) {
  const source = String(text || "").trim();
  const embedded = source.match(/```(?:yaml|yml)?\n([\s\S]*?)\n```/i);
  if (embedded) {
    return embedded[1].trim();
  }

  const fenced = source.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  if (fenced) {
    return fenced[1].trim();
  }
  return source;
}

export function getArtifactsDir(cwd = process.cwd()) {
  return path.resolve(cwd, "storage/opencode-runs");
}

export function getLatestArtifactPath(cwd = process.cwd()) {
  const artifactsDir = getArtifactsDir(cwd);
  if (!fs.existsSync(artifactsDir)) {
    return null;
  }

  const artifacts = fs
    .readdirSync(artifactsDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const fullPath = path.resolve(artifactsDir, fileName);
      return {
        fileName,
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return artifacts[0]?.fullPath || null;
}

function stripQuotedValue(raw) {
  const source = String(raw || "").trim();
  if (!source) {
    return "";
  }

  if ((source.startsWith("\"") && source.endsWith("\"")) || (source.startsWith("'") && source.endsWith("'"))) {
    return source.slice(1, -1);
  }

  return source;
}

function parseTopLevelScalar(text, key) {
  const expression = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = text.match(expression);
  if (!match) {
    return null;
  }
  return stripQuotedValue(match[1]);
}

function parseNestedMap(text, key) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const parentPattern = new RegExp(`^([ ]*)${key}:\\s*$`);
  let parentIndex = -1;
  let parentIndent = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(parentPattern);
    if (match) {
      parentIndex = i;
      parentIndent = match[1].length;
      break;
    }
  }

  if (parentIndex < 0) {
    return null;
  }

  const result = {};

  for (let i = parentIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }

    const indent = line.match(/^ */)[0].length;
    if (indent <= parentIndent) {
      break;
    }

    const kv = line.match(/^\s*([A-Za-z0-9_]+):\s*(.+)$/);
    if (!kv) {
      continue;
    }

    result[kv[1]] = stripQuotedValue(kv[2]);
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function validateExecutorResponseSchema(assistantText) {
  const normalized = stripCodeFence(assistantText);
  const issues = [];

  const schemaVersion = parseTopLevelScalar(normalized, "schema_version");
  if (!schemaVersion) {
    issues.push("missing schema_version");
  } else if (schemaVersion !== "1") {
    issues.push("schema_version must be 1");
  }

  const status = parseTopLevelScalar(normalized, "status");
  if (!status) {
    issues.push("missing status");
  } else if (status !== "success" && status !== "failed") {
    issues.push("status must be success or failed");
  }

  const taskRef = parseNestedMap(normalized, "task_ref");
  if (!taskRef) {
    issues.push("missing task_ref map");
  } else {
    if (!taskRef.packet_id) {
      issues.push("missing task_ref.packet_id");
    }
    if (!taskRef.phase) {
      issues.push("missing task_ref.phase");
    }
    if (!taskRef.attempt) {
      issues.push("missing task_ref.attempt");
    }
    if (!taskRef.executor_model) {
      issues.push("missing task_ref.executor_model");
    }
  }

  const allowedFailureTypes = new Set([
    "requirement_mismatch",
    "test_failure",
    "environment_blocker",
    "ambiguity_in_spec",
    "unsafe_change_risk",
    "dependency_gap",
  ]);

  let failureType = null;
  if (status === "failed") {
    failureType = parseTopLevelScalar(normalized, "failure_type");
    if (!failureType) {
      issues.push("missing failure_type for failed status");
    } else if (!allowedFailureTypes.has(failureType)) {
      issues.push("failure_type is not in allowed set");
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    normalized,
    status,
    failureType,
    taskRef,
  };
}
