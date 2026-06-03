import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  buildClient,
  parseArgs,
  readUtf8,
  extractPacketId,
  extractAttempt,
  parseClarifyPacket,
  formatClarifyPacket,
  tailEventStream,
  resolveEventBaseUrl,
  summarizeEventForConsole,
  detectTerminalEvent,
  normalizeAssistantTextFromV2,
  getArtifactsDir,
  writeJson,
  validateExecutorResponseSchema,
} from "./common.mjs";

function usage() {
  console.error([
    "Usage:",
    "  node scripts/opencode/run-auto.mjs --packet <file> [--mode v1|auto|v2] [--finalize-git --commit-message <msg> --all|--files <csv>] [--push]",
    "",
    "Optional overrides:",
    "  --provider <id>  manual provider override (bypasses auto provider)",
    "  --model <id>     manual model override (bypasses auto model)",
    "  --variant <id>   manual variant override (bypasses auto profile)",
    "  --session <id>   forward to run-packet",
    "  --title <title>  forward to run-packet",
    "  --agent <name>   forward to run-packet",
    "  --plan-sync      complete task in SQLite after validated success",
    "  --plan-sync-dry-run  show task completion without writing",
    "  --phase-plan <path>  explicit phase plan file path override (deprecated, uses SQLite)",
  ].join("\n"));
}

function extractPacketField(packetText, fieldName) {
  const expression = new RegExp(`^\\s*${fieldName}:\\s*([^\\n]+)$`, "m");
  const match = String(packetText || "").match(expression);
  if (!match) {
    return null;
  }

  const value = String(match[1] || "").trim().replace(/^['\"]|['\"]$/g, "");
  return value || null;
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.capture ? ["inherit", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    cwd: options.cwd || process.cwd(),
    env: process.env,
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sessionStateDir(projectRoot) {
  return path.resolve(getArtifactsDir(projectRoot), ".sessions");
}

function sessionStatePath(projectRoot, packetID) {
  const safeID = String(packetID || "packet").replace(/[^A-Za-z0-9._-]/g, "_");
  return path.resolve(sessionStateDir(projectRoot), `${safeID}.session`);
}

function readStoredSession(projectRoot, packetID) {
  const filePath = sessionStatePath(projectRoot, packetID);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const value = fs.readFileSync(filePath, "utf8").trim();
  return value || null;
}

function writeStoredSession(projectRoot, packetID, sessionID) {
  if (!sessionID) {
    return;
  }

  const normalizedSessionID = String(sessionID).trim();
  const filePath = sessionStatePath(projectRoot, packetID);
  const previousSessionID = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : null;

  ensureDir(sessionStateDir(projectRoot));
  fs.writeFileSync(filePath, `${normalizedSessionID}\n`, "utf8");

  if (previousSessionID !== normalizedSessionID) {
    console.error(`session-cache: wrote session=${normalizedSessionID} for packet ${packetID}`);
  }
}

function lockPathForPacket(projectRoot, packetID) {
  const safeID = String(packetID || "packet").replace(/[^A-Za-z0-9._-]/g, "_");
  return path.resolve(getArtifactsDir(projectRoot), ".locks", `${safeID}.lock`);
}

function readLock(lockPath) {
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function acquirePacketLock(projectRoot, packetID) {
  const lockPath = lockPathForPacket(projectRoot, packetID);
  ensureDir(path.dirname(lockPath));

  const staleMsRaw = Number.parseInt(String(process.env.OPENCODE_RUN_AUTO_LOCK_STALE_MS || "900000"), 10);
  const staleMs = Number.isFinite(staleMsRaw) && staleMsRaw > 0 ? staleMsRaw : 900000;
  const now = Date.now();
  const payload = {
    pid: process.pid,
    packetID,
    createdAtMs: now,
  };

  try {
    const fd = fs.openSync(lockPath, "wx");
    fs.writeFileSync(fd, `${JSON.stringify(payload)}\n`, "utf8");
    fs.closeSync(fd);
    return { lockPath, acquired: true };
  } catch (error) {
    if (error && error.code !== "EEXIST") {
      throw error;
    }
  }

  const existing = readLock(lockPath);
  const createdAtMs = Number(existing?.createdAtMs || 0);
  const ageMs = createdAtMs > 0 ? now - createdAtMs : Number.POSITIVE_INFINITY;

  if (ageMs > staleMs) {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // Another process may have removed/rotated it; fall through and try once more.
    }

    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, `${JSON.stringify(payload)}\n`, "utf8");
      fs.closeSync(fd);
      return { lockPath, acquired: true, replacedStale: true };
    } catch {
      // If lock was grabbed in the meantime, treat as active lock.
    }
  }

  return {
    lockPath,
    acquired: false,
    existing,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
  };
}

function releasePacketLock(lockHandle) {
  if (!lockHandle || !lockHandle.lockPath || !lockHandle.acquired) {
    return;
  }

  try {
    fs.unlinkSync(lockHandle.lockPath);
  } catch {
    // Best-effort cleanup.
  }
}

function getLatestArtifactPath(projectRoot) {
  const result = runCommand("node", [
    path.resolve(projectRoot, "scripts/opencode/last-artifact.mjs"),
  ], { capture: true, cwd: projectRoot });

  if (result.status !== 0) {
    return null;
  }

  const value = String(result.stdout || "").trim();
  return value || null;
}

function isTruthy(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value == null) {
    return false;
  }

  const lower = String(value).trim().toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes" || lower === "on";
}

function shouldSyncPlan(args) {
  return Boolean(args["plan-sync"] || args["plan-sync-dry-run"] || isTruthy(process.env.OPENCODE_PLAN_SYNC));
}

function isPlanSyncDryRun(args) {
  return Boolean(args["plan-sync-dry-run"] || isTruthy(process.env.OPENCODE_PLAN_SYNC_DRY_RUN));
}

function resolvePhasePlanPath(projectRoot, packetPhase, overridePath) {
  if (overridePath) {
    const explicit = path.resolve(projectRoot, String(overridePath));
    return fs.existsSync(explicit) ? explicit : null;
  }

  const envOverride = process.env.OPENCODE_PHASE_PLAN_PATH;
  if (envOverride && envOverride.trim()) {
    const explicit = path.resolve(projectRoot, envOverride.trim());
    return fs.existsSync(explicit) ? explicit : null;
  }

  const phase = String(packetPhase || "").trim();
  if (!phase) {
    return null;
  }

  const phaseFileCandidates = [];

  const phaseDir = path.resolve(getArtifactsDir(projectRoot), "phases");
  if (fs.existsSync(phaseDir)) {
    for (const fileName of fs.readdirSync(phaseDir)) {
      if (!fileName.toLowerCase().endsWith(".md")) {
        continue;
      }

      if (fileName.toLowerCase() === `${phase.toLowerCase()}.md` || fileName.toLowerCase().includes(phase.toLowerCase())) {
        phaseFileCandidates.push(path.resolve(phaseDir, fileName));
      }
    }
  }

  const docsPlansDir = path.resolve(projectRoot, ".opencode/DEVELOPMENT_DOCS/plans");
  if (fs.existsSync(docsPlansDir)) {
    for (const fileName of fs.readdirSync(docsPlansDir)) {
      if (!fileName.toLowerCase().endsWith(".md")) {
        continue;
      }

      if (fileName.toLowerCase().includes(phase.toLowerCase())) {
        phaseFileCandidates.push(path.resolve(docsPlansDir, fileName));
      }
    }
  }

  return phaseFileCandidates[0] || null;
}

function findPlanChecklistMatch(lines, packetID, taskIndex) {
  const packetToken = String(packetID || "").trim().toLowerCase();
  const taskToken = taskIndex != null && String(taskIndex).trim() !== ""
    ? `task ${String(taskIndex).trim().toLowerCase()}`
    : null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const unchecked = line.match(/^(\s*[-*]\s+)\[ \](\s+.*)$/);
    if (!unchecked) {
      continue;
    }

    const lower = line.toLowerCase();
    const packetMatch = packetToken && lower.includes(packetToken);
    const taskMatch = taskToken && lower.includes(taskToken);

    if (packetMatch || taskMatch) {
      return {
        index,
        line,
        updatedLine: `${unchecked[1]}[x]${unchecked[2]}`,
      };
    }
  }

  return null;
}

function planSyncFromArtifact({ projectRoot, artifactPath, packetID, packetPhase, dryRun, phasePlanOverride }) {
  if (!artifactPath || !fs.existsSync(artifactPath)) {
    return { ok: false, reason: "artifact_missing" };
  }

  let artifact = null;
  try {
    artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch {
    return { ok: false, reason: "artifact_parse_failed" };
  }

  if (!artifact || artifact.ok !== true || typeof artifact.assistantText !== "string") {
    return { ok: false, reason: "artifact_not_success_payload" };
  }

  const validation = validateExecutorResponseSchema(artifact.assistantText);
  if (!validation.valid) {
    return {
      ok: false,
      reason: "artifact_schema_invalid",
      issues: validation.issues,
    };
  }

  if (validation.status !== "success") {
    return { ok: false, reason: "artifact_status_not_success", status: validation.status };
  }

  if (String(validation.taskRef?.packet_id || "") !== String(packetID || "")) {
    return {
      ok: false,
      reason: "task_ref_packet_mismatch",
      taskRefPacketID: validation.taskRef?.packet_id || null,
    };
  }

  if (packetPhase && validation.taskRef?.phase && String(validation.taskRef.phase) !== String(packetPhase)) {
    return {
      ok: false,
      reason: "task_ref_phase_mismatch",
      taskRefPhase: validation.taskRef.phase,
    };
  }

  const phasePlanPath = resolvePhasePlanPath(projectRoot, validation.taskRef?.phase || packetPhase, phasePlanOverride);
  if (!phasePlanPath) {
    return { ok: false, reason: "phase_plan_not_found" };
  }

  const source = fs.readFileSync(phasePlanPath, "utf8");
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const match = findPlanChecklistMatch(lines, validation.taskRef?.packet_id, validation.taskRef?.task_index);

  if (!match) {
    return {
      ok: false,
      reason: "no_matching_unchecked_step",
      phasePlanPath,
    };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      phasePlanPath,
      lineNumber: match.index + 1,
      before: match.line,
      after: match.updatedLine,
    };
  }

  lines[match.index] = match.updatedLine;
  fs.writeFileSync(phasePlanPath, `${lines.join("\n")}\n`, "utf8");

  return {
    ok: true,
    dryRun: false,
    phasePlanPath,
    lineNumber: match.index + 1,
    before: match.line,
    after: match.updatedLine,
  };
}

function ingestState(projectRoot, args) {
  const result = runCommand("php", args, { capture: true, cwd: projectRoot });
  if (result.status !== 0) {
    const errorOutput = (result.stderr || result.stdout || "state ingest failed").trim();
    console.error(`warning: ${errorOutput}`);
    return;
  }

  const output = (result.stdout || "").trim();
  if (output) {
    console.error(`state: ${output}`);
  }
}

function dispatchDecision(projectRoot, packetPath) {
  const result = runCommand("php", [
    path.resolve(projectRoot, "scripts/opencode/dispatch.php"),
    "--packet",
    packetPath,
    "--format",
    "json",
  ], { capture: true, cwd: projectRoot });

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "dispatch failed").trim();
    throw new Error(err);
  }

  return JSON.parse(result.stdout);
}

function packetExistsInState(projectRoot, packetID) {
  const result = runCommand("php", [
    path.resolve(projectRoot, "scripts/opencode/state.php"),
    "context",
    "--packet-id",
    String(packetID),
    "--limit",
    "1",
  ], { capture: true, cwd: projectRoot });

  if (result.status !== 0) {
    return false;
  }

  try {
    const parsed = JSON.parse(String(result.stdout || "{}"));
    return Boolean(parsed && parsed.packet);
  } catch {
    return false;
  }
}

function clarifyExitCode() {
  const raw = Number.parseInt(String(process.env.OPENCODE_CLARIFY_EXIT_CODE || "2"), 10);
  return Number.isFinite(raw) && raw >= 0 && raw <= 255 ? raw : 2;
}

function terminalRecoveryGraceMs() {
  const raw = Number.parseInt(String(process.env.OPENCODE_TERMINAL_RECOVERY_GRACE_MS || "5000"), 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 5000;
}

function terminalEventGraceMs(reason) {
  const fallback = terminalRecoveryGraceMs();
  const lower = String(reason || "").toLowerCase();

  if (lower.includes("idle")) {
    const raw = Number.parseInt(String(process.env.OPENCODE_TERMINAL_IDLE_GRACE_MS || "1500"), 10);
    return Number.isFinite(raw) && raw >= 0 ? raw : 1500;
  }

  return fallback;
}

function recoveryWaitMs() {
  const raw = Number.parseInt(String(process.env.OPENCODE_RECOVERY_WAIT_MS || "240000"), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 240000;
}

function recoveryPollMs() {
  const raw = Number.parseInt(String(process.env.OPENCODE_RECOVERY_POLL_MS || "2000"), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 2000;
}

function isEventTailEnabled() {
  const value = String(process.env.OPENCODE_TAIL_EVENTS || "1").trim().toLowerCase();
  return value !== "0" && value !== "false" && value !== "off" && value !== "no";
}

function extractSessionIdFromLine(line) {
  const match = String(line || "").match(/session_id=(\S+)/);
  return match ? match[1] : null;
}

function shouldSuppressFailureRecord({ loopResult, reusedSessionID, artifactBefore, artifactAfter }) {
  if (!reusedSessionID) {
    return false;
  }

  if (artifactAfter && artifactAfter !== artifactBefore) {
    return false;
  }

  const terminalReason = String(loopResult?.terminalEvent?.reason || "").toLowerCase();
  if (terminalReason.includes("idle") || terminalReason.includes("aborted") || terminalReason.includes("cancelled") || terminalReason.includes("canceled")) {
    return true;
  }

  const status = Number(loopResult?.status || 0);
  return status === 124 || status === 130 || status === 143;
}

async function runLoopWithTelemetry(projectRoot, runLoopArgs) {
  const child = spawn("bash", runLoopArgs, {
    cwd: projectRoot,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  let stdoutBuffer = "";
  let stderrBuffer = "";
  let sessionID = null;
  let eventTailPromise = null;
  let eventAbortController = null;
  let transcriptPath = null;
  let recoveredArtifactPath = null;
  const assistantMessageIDs = new Set();
  const assistantPartBuffers = new Map();

  const packetArgIndex = runLoopArgs.findIndex((value) => value === "--packet");
  const packetPathArg = packetArgIndex >= 0 ? runLoopArgs[packetArgIndex + 1] : null;
  const packetText = packetPathArg ? readUtf8(packetPathArg) : "";
  const telemetryPacketID = extractPacketId(packetText, "packet");
  const providerArgIndex = runLoopArgs.findIndex((value) => value === "--provider");
  const modelArgIndex = runLoopArgs.findIndex((value) => value === "--model");
  const variantArgIndex = runLoopArgs.findIndex((value) => value === "--variant");
  const telemetryProvider = providerArgIndex >= 0 ? runLoopArgs[providerArgIndex + 1] : null;
  const telemetryModel = modelArgIndex >= 0 ? runLoopArgs[modelArgIndex + 1] : null;
  const telemetryVariant = variantArgIndex >= 0 ? runLoopArgs[variantArgIndex + 1] : null;

  if (telemetryPacketID) {
    transcriptPath = path.resolve(getArtifactsDir(projectRoot), `${telemetryPacketID}-transcript.md`);
    fs.writeFileSync(
      transcriptPath,
      [
        `# Executor Session Transcript for ${telemetryPacketID}`,
        `- Date: ${new Date().toISOString()}`,
        "",
        "## Live Execution Log",
        "```text",
      ].join("\n") + "\n",
      "utf8",
    );
  }

  const appendTranscript = (line) => {
    if (!transcriptPath) {
      return;
    }
    fs.appendFileSync(transcriptPath, `${line}\n`, "utf8");
  };

  const closeTranscript = (footerLine) => {
    if (!transcriptPath) {
      return;
    }
    fs.appendFileSync(transcriptPath, `\n` + "```" + `\n\n## Execution Concluded\n${footerLine}\n`, "utf8");
    transcriptPath = null;
  };

  const eventRecoveredAssistantText = () => {
    const text = [...assistantPartBuffers.values()].join("");
    return text.trim();
  };

  const writeRecoveredArtifact = ({ assistantText, transport, raw }) => {
    if (!assistantText || !assistantText.trim() || !telemetryPacketID || !packetPathArg) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const artifactPath = path.resolve(getArtifactsDir(projectRoot), `${timestamp}-${telemetryPacketID}.json`);

    writeJson(artifactPath, {
      ok: true,
      sessionID,
      transport,
      packetID: telemetryPacketID,
      provider: telemetryProvider ? String(telemetryProvider) : null,
      model: telemetryModel ? String(telemetryModel) : null,
      variant: telemetryVariant ? String(telemetryVariant) : null,
      assistantText,
      packetPath: packetPathArg,
      raw,
    });

    appendTranscript(`recovery: wrote artifact ${artifactPath} (${transport})`);
    return artifactPath;
  };

  const recoverArtifactFromSession = async () => {
    if (!sessionID || !telemetryPacketID || !packetPathArg) {
      return null;
    }

    const client = buildClient();
    const deadline = Date.now() + recoveryWaitMs();

    while (Date.now() < deadline) {
      let messagesResponse = null;
      try {
        messagesResponse = await client.request("GET", `/api/session/${sessionID}/message?order=asc&limit=50`);
      } catch (error) {
        appendTranscript(`recovery: session history unavailable (${error.message || String(error)})`);
      }

      if (messagesResponse?.ok) {
        const assistantText = normalizeAssistantTextFromV2(messagesResponse.data);
        if (assistantText && assistantText.trim()) {
          const validation = validateExecutorResponseSchema(assistantText);
          if (!validation.valid) {
            appendTranscript(`recovery: session-history assistant text schema invalid (${validation.issues.join('; ')})`);
          }

          return writeRecoveredArtifact({
            assistantText,
            transport: validation.valid ? "event-recovered-session" : "event-recovered-session-invalid",
            raw: messagesResponse.data,
          });
        }
      }

      const deltaAssistantText = eventRecoveredAssistantText();
      if (deltaAssistantText) {
        const validation = validateExecutorResponseSchema(deltaAssistantText);
        if (!validation.valid) {
          appendTranscript(`recovery: event-delta assistant text schema invalid (${validation.issues.join('; ')})`);
        }

        return writeRecoveredArtifact({
          assistantText: deltaAssistantText,
          transport: validation.valid ? "event-recovered-delta" : "event-recovered-delta-invalid",
          raw: {
            source: "event-stream",
            assistantMessageIDs: [...assistantMessageIDs],
            partCount: assistantPartBuffers.size,
          },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, recoveryPollMs()));
    }

    appendTranscript(`recovery: no assistant artifact found within ${recoveryWaitMs()}ms after terminal event`);
    return null;
  };

  const maybeStartEventTail = (line) => {
    const detected = extractSessionIdFromLine(line);
    if (detected && detected !== sessionID) {
      sessionID = detected;
      writeStoredSession(projectRoot, telemetryPacketID, sessionID);
    }

    if (!detected || !isEventTailEnabled() || eventTailPromise) {
      return;
    }

    const eventBaseUrl = resolveEventBaseUrl();
    eventAbortController = new AbortController();

    console.error(`event-tail: attached session=${sessionID} endpoint=${eventBaseUrl}/event`);
    appendTranscript(`event-tail: attached session=${sessionID} endpoint=${eventBaseUrl}/event`);

    eventTailPromise = tailEventStream({
      baseUrl: eventBaseUrl,
      sessionID,
      signal: eventAbortController.signal,
      onEvent: (event) => {
        const eventType = String(event?.type || "");
        const properties = event?.properties && typeof event.properties === "object" ? event.properties : {};

        if (eventType === "message.updated") {
          const info = properties.info && typeof properties.info === "object" ? properties.info : {};
          if (info.role === "assistant" && typeof info.id === "string" && info.id.trim()) {
            assistantMessageIDs.add(info.id.trim());
          }
        }

        if (assistantMessageIDs.has(String(properties.messageID || ""))) {
          if (eventType === "message.part.updated") {
            const part = properties.part && typeof properties.part === "object" ? properties.part : {};
            const partID = String(part.id || properties.partID || "").trim();
            const partText = typeof part.text === "string" ? part.text : "";
            if (partID && partText && (!assistantPartBuffers.has(partID) || assistantPartBuffers.get(partID).length < partText.length)) {
              assistantPartBuffers.set(partID, partText);
            }
          }

          if (eventType === "message.part.delta" && properties.field === "text") {
            const partID = String(properties.partID || "").trim();
            const delta = typeof properties.delta === "string" ? properties.delta : "";
            if (partID && delta) {
              assistantPartBuffers.set(partID, `${assistantPartBuffers.get(partID) || ""}${delta}`);
            }
          }
        }

        const summary = summarizeEventForConsole(event);
        if (summary) {
          console.error(`[event] ${summary}`);
          appendTranscript(`[event] ${summary}`);
        }

        const terminalEvent = detectTerminalEvent(event);
        if (terminalEvent.terminal) {
          console.error(`event-tail: terminal event detected (${terminalEvent.reason})`);
          appendTranscript(`event-tail: terminal event detected (${terminalEvent.reason})`);
          return terminalEvent;
        }
      },
    }).catch((error) => {
      if (error && error.name === "AbortError") {
        return null;
      }
      const message = error && error.message ? error.message : String(error);
      console.error(`warning: event tail unavailable (${message})`);
      appendTranscript(`warning: event tail unavailable (${message})`);
      return null;
    });
  };

  const processLines = (chunk, stream, bufferRef) => {
    const text = String(chunk || "");
    if (stream === "stdout") {
      process.stdout.write(text);
    } else {
      process.stderr.write(text);
    }

    bufferRef.value += text;
    const lines = bufferRef.value.split(/\r?\n/);
    bufferRef.value = lines.pop() || "";

    for (const line of lines) {
      maybeStartEventTail(line);
    }
  };

  if (child.stdout) {
    child.stdout.on("data", (chunk) => processLines(chunk, "stdout", { get value() { return stdoutBuffer; }, set value(v) { stdoutBuffer = v; } }));
  }

  if (child.stderr) {
    child.stderr.on("data", (chunk) => processLines(chunk, "stderr", { get value() { return stderrBuffer; }, set value(v) { stderrBuffer = v; } }));
  }

  let childExited = false;
  const childClosePromise = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => {
      childExited = true;
      if (signal) {
        resolve(128 + 15);
        return;
      }
      resolve(code ?? 1);
    });
  });

  let terminalEvent = null;
  if (eventTailPromise) {
    terminalEvent = await Promise.race([
      eventTailPromise,
      childClosePromise.then(() => null),
    ]);
  }

  if (terminalEvent?.reason && !childExited) {
    const graceMs = terminalEventGraceMs(terminalEvent.reason);
    appendTranscript(`recovery: waiting ${graceMs}ms for child exit after terminal event`);
    const graceResult = await Promise.race([
      childClosePromise.then((code) => ({ type: "child_exit", code })),
      new Promise((resolve) => setTimeout(() => resolve({ type: "timeout" }), graceMs)),
    ]);

    if (graceResult.type === "timeout") {
      recoveredArtifactPath = await recoverArtifactFromSession();
      if (recoveredArtifactPath) {
        console.error(`recovery: terminating child after artifact recovery (${recoveredArtifactPath})`);
        appendTranscript(`recovery: terminating child after artifact recovery (${recoveredArtifactPath})`);
      } else {
        console.error("recovery: terminating child after terminal event timeout (no recovered artifact)");
        appendTranscript("recovery: terminating child after terminal event timeout (no recovered artifact)");
      }

      child.kill("SIGTERM");

      const terminateResult = await Promise.race([
        childClosePromise.then(() => ({ type: "child_exit" })),
        new Promise((resolve) => setTimeout(() => resolve({ type: "timeout" }), graceMs)),
      ]);

      if (terminateResult.type === "timeout" && !childExited) {
        console.error("recovery: child still running after SIGTERM; sending SIGKILL");
        appendTranscript("recovery: child still running after SIGTERM; sending SIGKILL");
        child.kill("SIGKILL");
      }
    }
  }

  const exitCode = await childClosePromise;

  if (!recoveredArtifactPath) {
    const deltaAssistantText = eventRecoveredAssistantText();
    if (deltaAssistantText) {
      const validation = validateExecutorResponseSchema(deltaAssistantText);
      if (!validation.valid) {
        appendTranscript(`recovery: post-exit event-delta assistant text schema invalid (${validation.issues.join('; ')})`);
      }

      recoveredArtifactPath = writeRecoveredArtifact({
        assistantText: deltaAssistantText,
        transport: validation.valid ? "event-recovered-delta-post-exit" : "event-recovered-delta-post-exit-invalid",
        raw: {
          source: "event-stream-post-exit",
          assistantMessageIDs: [...assistantMessageIDs],
          partCount: assistantPartBuffers.size,
        },
      });
    }
  }

  if (eventAbortController) {
    eventAbortController.abort();
  }

  if (terminalEvent?.reason) {
    closeTranscript(`Terminal event: ${terminalEvent.reason}`);
  } else {
    closeTranscript(`Process exit code: ${exitCode}`);
  }

  return {
    status: exitCode,
    sessionID,
    terminalEvent,
    recoveredArtifactPath,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.packet) {
    usage();
    process.exit(1);
  }

  const projectRoot = path.resolve(process.cwd());
  const packetPath = path.resolve(projectRoot, String(args.packet));
  const packetText = readUtf8(packetPath);
  const packetID = extractPacketId(packetText, "packet");
  const packetAttempt = extractAttempt(packetText);
  const packetPhase = extractPacketField(packetText, "phase");
  const planSyncRequested = shouldSyncPlan(args);
  const planSyncDryRun = isPlanSyncDryRun(args);
  const phasePlanOverride = args["phase-plan"] ? String(args["phase-plan"]) : null;
  const clarification = parseClarifyPacket(packetText);

  if (clarification) {
    const alreadyExists = packetExistsInState(projectRoot, packetID);
    if (alreadyExists) {
      console.error(`warning: packet_id ${packetID} already exists in state; skipping clarify ingest to avoid mutating historical packet metadata`);
    } else {
      ingestState(projectRoot, [
        path.resolve(projectRoot, "scripts/opencode/state.php"),
        "ingest-packet",
        "--packet",
        packetPath,
      ]);
    }

    console.error(`Gate 0 clarification required for packet ${packetID}; execution paused.`);
    process.stdout.write(formatClarifyPacket(clarification));
    process.exit(clarifyExitCode());
  }

  const lockHandle = acquirePacketLock(projectRoot, packetID);
  if (!lockHandle.acquired) {
    const lockAge = lockHandle.ageMs === null ? "unknown" : `${Math.floor(lockHandle.ageMs / 1000)}s`;
    console.error(`error: run lock is active for packet ${packetID}; lock=${lockHandle.lockPath}; age=${lockAge}`);
    process.exit(2);
  }

  try {
    ingestState(projectRoot, [
      path.resolve(projectRoot, "scripts/opencode/state.php"),
      "ingest-packet",
      "--packet",
      packetPath,
    ]);

    const decision = dispatchDecision(projectRoot, packetPath);

    console.log(JSON.stringify({
      route: decision.route,
      taskClass: decision.task_class,
      riskLevel: decision.risk_level,
      profile: decision.profile,
      variant: decision.variant,
      routeSource: decision.route_source,
      provider: decision.provider,
      model: decision.model,
    }, null, 2));

    if (decision.route === "local_git") {
      console.log("Route selected: local git plumbing (executor skipped)");
      return 0;
    }

    const provider = args.provider ? String(args.provider) : String(decision.provider || "");
    const model = args.model ? String(args.model) : String(decision.model || "");
    const variant = args.variant ? String(args.variant) : String(decision.variant || decision.profile || "");
    const storedSessionID = !args.session ? readStoredSession(projectRoot, packetID) : null;

    const runLoopArgs = [
      path.resolve(projectRoot, "scripts/opencode/run-loop.sh"),
      "--packet",
      packetPath,
      "--mode",
      String(args.mode || "v1"),
    ];

    if (args.session) {
      runLoopArgs.push("--session", String(args.session));
    } else if (storedSessionID) {
      console.error(`session-cache: reusing session=${storedSessionID} for packet ${packetID}`);
      runLoopArgs.push("--session", storedSessionID);
    }
    if (args.title) {
      runLoopArgs.push("--title", String(args.title));
    }
    if (args.agent) {
      runLoopArgs.push("--agent", String(args.agent));
    }
    if (provider && model) {
      runLoopArgs.push("--provider", provider, "--model", model);
    }
    if (variant) {
      runLoopArgs.push("--variant", variant);
    }

    const artifactBefore = getLatestArtifactPath(projectRoot);
    const loopResult = await runLoopWithTelemetry(projectRoot, runLoopArgs);
    if (loopResult.sessionID) {
      writeStoredSession(projectRoot, packetID, loopResult.sessionID);
    }

    const artifactAfter = loopResult.recoveredArtifactPath || getLatestArtifactPath(projectRoot);
    if (artifactAfter && artifactAfter !== artifactBefore) {
      ingestState(projectRoot, [
        path.resolve(projectRoot, "scripts/opencode/state.php"),
        "ingest-artifact",
        "--artifact",
        artifactAfter,
      ]);

      if (planSyncRequested) {
        const taskCompleteAction = planSyncDryRun ? "would complete" : "completed";
        console.error(`plan-sync: ${taskCompleteAction} task ${packetID}`);

        if (!planSyncDryRun) {
          const completeResult = runCommand("php", [
            path.resolve(projectRoot, "scripts/opencode/state.php"),
            "task:complete",
            "--task-id",
            packetID,
          ], { capture: true, cwd: projectRoot });

          if (completeResult.status === 0) {
            console.error(`plan-sync: task ${packetID} marked completed in SQLite`);
          } else {
            console.error(`plan-sync: failed to complete task ${packetID}: ${completeResult.stdout} ${completeResult.stderr}`);
          }
        }
      }
    } else if (loopResult.status !== 0) {
      if (shouldSuppressFailureRecord({
        loopResult,
        reusedSessionID: storedSessionID,
        artifactBefore,
        artifactAfter,
      })) {
        console.error(`state: skipping failure record for interrupted reused session ${packetID}`);
        return loopResult.status || 1;
      }

      console.error("state: run failed with no new artifact; recording failure for packet " + packetID);
      const recordArgs = [
        path.resolve(projectRoot, "scripts/opencode/state.php"),
        "record-failure",
        "--packet-id",
        packetID,
        "--failure-type",
        "environment_blocker",
        "--session-id",
        loopResult.sessionID || storedSessionID || "",
        "--transport",
        loopResult.terminalEvent?.reason || "run-loop",
        "--packet-path",
        packetPath,
      ];
      if (packetAttempt != null) {
        recordArgs.push("--attempt", String(packetAttempt));
      }
      if (model) {
        recordArgs.push("--model", model);
      }
      if (provider) {
        recordArgs.push("--provider", provider);
      }
      if (variant) {
        recordArgs.push("--variant", variant);
      }
      if (packetPhase) {
        recordArgs.push("--phase", packetPhase);
      }
      if (decision.task_class) {
        recordArgs.push("--task-class", String(decision.task_class));
      }
      ingestState(projectRoot, recordArgs);
    } else {
      console.error("state: no new artifact detected for this run; skipping run ingest");
    }

    if (loopResult.status !== 0) {
      return loopResult.status || 1;
    }

    const finalizeGit = Boolean(args["finalize-git"] || decision.finalize_git);
    if (!finalizeGit) {
      return 0;
    }

    if (!args["commit-message"]) {
      console.error("--commit-message is required when --finalize-git is set");
      return 1;
    }

    const finalizeArgs = [
      path.resolve(projectRoot, "scripts/opencode/git-finalize.sh"),
      "--message",
      String(args["commit-message"]),
    ];

    if (args.push) {
      finalizeArgs.push("--push");
    }

    if (args.all) {
      finalizeArgs.push("--all");
    } else if (args.files) {
      finalizeArgs.push("--files", String(args.files));
    } else {
      console.error("--all or --files is required when --finalize-git is set");
      return 1;
    }

    const finalizeResult = runCommand("bash", finalizeArgs, { cwd: projectRoot });
    return finalizeResult.status || 0;
  } finally {
    releasePacketLock(lockHandle);
  }
}

main()
  .then((status) => {
    process.exit(typeof status === "number" ? status : 0);
  })
  .catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  });
