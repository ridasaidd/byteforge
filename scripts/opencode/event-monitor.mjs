import { parseArgs, requireEnv } from "./common.mjs";

function usage() {
  console.error([
    "Usage:",
    "  node scripts/opencode/event-monitor.mjs [--session <id>] [--include <csv>] [--exclude <csv>] [--show-delta] [--raw] [--max <n>] [--preset safe|full]",
    "",
    "Environment variables:",
    "  OPENCODE_USER (required)",
    "  OPENCODE_PASS (required)",
    "  OPENCODE_BASE_URL (optional, defaults to http://100.80.45.13:4096)",
    "  OPENCODE_EVENT_BASE_URL (optional, overrides event stream base URL)",
    "",
    "Defaults:",
    "  preset=safe",
    "  exclude includes message.part.delta",
  ].join("\n"));
}

function csvToSet(input) {
  if (!input) {
    return new Set();
  }

  return new Set(
    String(input)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function buildFilters(args) {
  const preset = String(args.preset || "safe").toLowerCase();

  const include = csvToSet(args.include);
  const exclude = csvToSet(args.exclude);

  if (preset === "safe" && include.size === 0 && exclude.size === 0) {
    exclude.add("message.part.delta");
  }

  return {
    preset,
    include,
    exclude,
  };
}

function shouldKeepEvent(eventType, sessionID, filters, sessionFilter) {
  if (sessionFilter && sessionID && sessionID !== sessionFilter) {
    return false;
  }

  if (sessionFilter && !sessionID) {
    return false;
  }

  if (filters.include.size > 0 && !filters.include.has(eventType)) {
    return false;
  }

  if (filters.exclude.has(eventType)) {
    return false;
  }

  return true;
}

function summarizeEvent(event, showDelta) {
  const type = String(event?.type || "unknown");
  const properties = event?.properties && typeof event.properties === "object" ? event.properties : {};

  if (type === "message.part.delta") {
    const delta = String(properties.delta || "").replace(/\s+/g, " ").trim();
    if (!showDelta) {
      return "(hidden delta)";
    }
    if (delta.length <= 120) {
      return delta;
    }
    return `${delta.slice(0, 117)}...`;
  }

  const fields = [
    ["session", properties.sessionID || event.sessionID],
    ["message", properties.messageID],
    ["part", properties.partID],
    ["field", properties.field],
    ["status", properties.status],
    ["error", properties.error || event.error],
  ];

  const compact = fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${String(value)}`);

  return compact.join(" ");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    process.exit(0);
  }

  const baseUrl = (process.env.OPENCODE_EVENT_BASE_URL || process.env.OPENCODE_BASE_URL || "http://100.80.45.13:4096").replace(/\/$/, "");
  const username = requireEnv("OPENCODE_USER");
  const password = requireEnv("OPENCODE_PASS");
  const auth = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  const sessionFilter = args.session ? String(args.session) : null;
  const filters = buildFilters(args);
  const showDelta = Boolean(args["show-delta"]);
  const raw = Boolean(args.raw);
  const max = Number.isFinite(Number(args.max)) ? Math.max(1, Number(args.max)) : null;

  const url = `${baseUrl}/event`;
  const controller = new AbortController();

  process.on("SIGINT", () => {
    controller.abort();
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "text/event-stream",
    },
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`Event stream request failed: status=${response.status}`);
  }

  if (!response.body) {
    throw new Error("Event stream response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let printed = 0;

  console.error(`Connected: ${url}`);
  console.error(`Filters: preset=${filters.preset} include=${[...filters.include].join(",") || "-"} exclude=${[...filters.exclude].join(",") || "-"} session=${sessionFilter || "-"}`);

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
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

      const type = String(event?.type || "unknown");
      const sessionID = String(event?.properties?.sessionID || event?.sessionID || "");
      if (!shouldKeepEvent(type, sessionID || null, filters, sessionFilter)) {
        continue;
      }

      if (raw) {
        console.log(payload);
      } else {
        const timestamp = new Date().toISOString();
        const summary = summarizeEvent(event, showDelta);
        const sessionText = sessionID || "-";
        console.log(`${timestamp} ${type} session=${sessionText}${summary ? ` ${summary}` : ""}`);
      }

      printed += 1;
      if (max !== null && printed >= max) {
        controller.abort();
        return;
      }
    }
  }
}

main().catch((error) => {
  if (error && error.name === "AbortError") {
    process.exit(0);
  }

  console.error(error.message || String(error));
  process.exit(1);
});
