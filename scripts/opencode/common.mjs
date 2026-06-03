import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.capture ? ["inherit", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    cwd: options.cwd || process.cwd(),
    env: process.env,
  });
}

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
  const timeoutMsRaw = Number.parseInt(String(process.env.OPENCODE_HTTP_TIMEOUT_MS || "120000"), 10);
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 120000;
  const auth = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  async function request(method, endpoint, body) {
    const url = `${baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs}ms: ${method} ${endpoint}`);
      }

      const message = error && error.message ? error.message : String(error);
      throw new Error(`Request failed: ${method} ${endpoint} (${message})`);
    } finally {
      clearTimeout(timer);
    }

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

export function resolveEventBaseUrl() {
  return (process.env.OPENCODE_EVENT_BASE_URL || process.env.OPENCODE_BASE_URL || "http://100.80.45.13:4096").replace(/\/$/, "");
}

function extractSessionIdFromEvent(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const direct = event.sessionID;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const props = event.properties;
  if (props && typeof props === "object" && typeof props.sessionID === "string" && props.sessionID.trim()) {
    return props.sessionID.trim();
  }

  return null;
}

export function summarizeEventForConsole(event) {
  const type = String(event?.type || "unknown");
  const properties = event?.properties && typeof event.properties === "object" ? event.properties : {};

  const formatFieldValue = (value) => {
    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[object]";
      }
    }

    return String(value);
  };

  if (type === "message.part.delta") {
    return null;
  }

  if (type === "session.diff") {
    const diff = Array.isArray(properties.diff) ? properties.diff : [];
    const fileCount = diff.length;
    return `${type} files=${fileCount}`;
  }

  const fields = [
    ["session", properties.sessionID || event?.sessionID],
    ["message", properties.messageID],
    ["status", properties.status],
    ["error", properties.error || event?.error],
  ];

  const compact = fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${formatFieldValue(value)}`)
    .join(" ");

  return compact ? `${type} ${compact}` : type;
}

function collectTerminalStatusHints(value, output) {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized) {
      output.add(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTerminalStatusHints(item, output);
    }
    return;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectTerminalStatusHints(nested, output);
    }
  }
}

export function detectTerminalEvent(event) {
  const type = String(event?.type || "").trim().toLowerCase();
  const hints = new Set();
  collectTerminalStatusHints(event?.properties?.status, hints);
  collectTerminalStatusHints(event?.status, hints);
  collectTerminalStatusHints(event?.properties?.state, hints);
  collectTerminalStatusHints(event?.properties?.result, hints);

  const terminalHint = [...hints].find((hint) => (
    hint === "completed"
    || hint === "complete"
    || hint === "finished"
    || hint === "done"
    || hint === "idle"
    || hint === "success"
    || hint === "failed"
    || hint === "error"
    || hint === "aborted"
    || hint === "cancelled"
    || hint === "canceled"
  ));

  if (type === "message.completed" || type === "session.completed") {
    return {
      terminal: true,
      reason: type,
    };
  }

  if ((type === "session.status" || type === "message.updated" || type === "session.updated") && terminalHint) {
    return {
      terminal: true,
      reason: `${type}:${terminalHint}`,
    };
  }

  return {
    terminal: false,
    reason: null,
  };
}

export async function tailEventStream({
  baseUrl,
  sessionID = null,
  onEvent,
  signal,
  includeTypes = null,
  excludeTypes = null,
} = {}) {
  const streamBaseUrl = (baseUrl || resolveEventBaseUrl()).replace(/\/$/, "");
  const url = `${streamBaseUrl}/event`;

  const username = requireEnv("OPENCODE_USER");
  const password = requireEnv("OPENCODE_PASS");
  const auth = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  const include = includeTypes instanceof Set ? includeTypes : null;
  const exclude = excludeTypes instanceof Set ? excludeTypes : null;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "text/event-stream",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to connect to event stream: status=${response.status}`);
  }

  if (!response.body) {
    throw new Error("Event stream response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return null;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      const eventType = String(event?.type || "unknown");
      const eventSessionID = extractSessionIdFromEvent(event);

      if (sessionID && (!eventSessionID || eventSessionID !== sessionID)) {
        continue;
      }

      if (include && include.size > 0 && !include.has(eventType)) {
        continue;
      }

      if (exclude && exclude.has(eventType)) {
        continue;
      }

      if (typeof onEvent === "function") {
        const result = await onEvent(event, payload);
        if (result !== undefined && result !== null) {
          return result;
        }
      }
    }
  }
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

export function getRuntimeDir(cwd = process.cwd()) {
  const raw = process.env.OPENCODE_RUNTIME_DIR;
  if (typeof raw === "string" && raw.trim()) {
    const value = raw.trim();
    return path.isAbsolute(value) ? value : path.resolve(cwd, value);
  }

  return path.resolve(cwd, ".opencode/runtime");
}

export function extractPacketId(packetText, fallback = "packet") {
  const match = packetText.match(/packet_id:\s*([A-Za-z0-9._-]+)/);
  return match ? match[1] : fallback;
}

export function extractAttempt(packetText, fallback = null) {
  const match = packetText.match(/attempt:\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : fallback;
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

  for (let index = assistant.length - 1; index >= 0; index -= 1) {
    const content = Array.isArray(assistant[index].content) ? assistant[index].content : [];
    const chunks = content
      .filter((part) => part && part.type === "text" && typeof part.text === "string")
      .map((part) => part.text.trim())
      .filter(Boolean);

    const normalized = stripCodeFence(chunks.join("\n\n"));
    if (normalized) {
      return normalized;
    }
  }

  return "";
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
  return path.resolve(getRuntimeDir(cwd), "runs");
}

export function getLatestArtifactPath(cwd = process.cwd()) {
  const artifactsDir = getArtifactsDir(cwd);
  if (!fs.existsSync(artifactsDir)) {
    return null;
  }

  const latestPointer = path.resolve(artifactsDir, ".latest");
  if (fs.existsSync(latestPointer)) {
    const ref = fs.readFileSync(latestPointer, "utf8").trim();
    if (ref && fs.existsSync(ref)) {
      return ref;
    }
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

function parseListSection(text, key) {
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

  const items = [];

  for (let i = parentIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }

    const indent = line.match(/^ */)[0].length;
    if (indent <= parentIndent) {
      break;
    }

    const itemMatch = line.match(/^\s*-\s*(.+)$/);
    if (itemMatch) {
      items.push(stripQuotedValue(itemMatch[1]));
    }
  }

  return items.length > 0 ? items : null;
}

export function parseClarifyPacket(packetText) {
  const normalized = String(packetText || "");
  const status = parseTopLevelScalar(normalized, "status");

  if (status !== "clarify") {
    return null;
  }

  const taskRef = parseNestedMap(normalized, "task_ref");
  if (!taskRef) {
    return null;
  }

  return {
    schemaVersion: parseTopLevelScalar(normalized, "schema_version"),
    status,
    taskRef,
    gapsIdentified: parseListSection(normalized, "gaps_identified") || [],
    clarifyingQuestions: parseListSection(normalized, "clarifying_questions") || [],
  };
}

function yamlQuote(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

export function formatClarifyPacket(packet) {
  const taskRef = packet?.taskRef || {};
  const gaps = Array.isArray(packet?.gapsIdentified) ? packet.gapsIdentified : [];
  const questions = Array.isArray(packet?.clarifyingQuestions) ? packet.clarifyingQuestions : [];

  const lines = [
    "schema_version: 1",
    "status: clarify",
    "task_ref:",
    `  packet_id: ${String(taskRef.packet_id ?? "packet")}`,
    `  phase: ${String(taskRef.phase ?? "PHASE19")}`,
    `  attempt: ${String(taskRef.attempt ?? 1)}`,
  ];

  if (gaps.length > 0) {
    lines.push("gaps_identified:");
    for (const gap of gaps) {
      lines.push(`  - ${yamlQuote(gap)}`);
    }
  } else {
    lines.push("gaps_identified: []");
  }

  if (questions.length > 0) {
    lines.push("clarifying_questions:");
    for (const question of questions) {
      lines.push(`  - ${yamlQuote(question)}`);
    }
  } else {
    lines.push("clarifying_questions: []");
  }

  return `${lines.join("\n")}\n`;
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
