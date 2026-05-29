import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs, readUtf8, extractPacketId, extractAttempt } from "./common.mjs";

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

function lockPathForPacket(projectRoot, packetID) {
  const safeID = String(packetID || "packet").replace(/[^A-Za-z0-9._-]/g, "_");
  return path.resolve(projectRoot, "storage/opencode-runs/.locks", `${safeID}.lock`);
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

function main() {
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
      process.exit(0);
    }

    const provider = args.provider ? String(args.provider) : String(decision.provider || "");
    const model = args.model ? String(args.model) : String(decision.model || "");
    const variant = args.variant ? String(args.variant) : String(decision.variant || decision.profile || "");

    const runLoopArgs = [
      path.resolve(projectRoot, "scripts/opencode/run-loop.sh"),
      "--packet",
      packetPath,
      "--mode",
      String(args.mode || "v1"),
    ];

    if (args.session) {
      runLoopArgs.push("--session", String(args.session));
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
    const loopResult = runCommand("bash", runLoopArgs, { cwd: projectRoot });

    const artifactAfter = getLatestArtifactPath(projectRoot);
    if (artifactAfter && artifactAfter !== artifactBefore) {
      ingestState(projectRoot, [
        path.resolve(projectRoot, "scripts/opencode/state.php"),
        "ingest-artifact",
        "--artifact",
        artifactAfter,
      ]);
    } else if (loopResult.status !== 0) {
      console.error("state: run failed with no new artifact; recording failure for packet " + packetID);
      const recordArgs = [
        path.resolve(projectRoot, "scripts/opencode/state.php"),
        "record-failure",
        "--packet-id",
        packetID,
        "--failure-type",
        "environment_blocker",
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
      process.exit(loopResult.status || 1);
    }

    const finalizeGit = Boolean(args["finalize-git"] || decision.finalize_git);
    if (!finalizeGit) {
      process.exit(0);
    }

    if (!args["commit-message"]) {
      console.error("--commit-message is required when --finalize-git is set");
      process.exit(1);
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
      process.exit(1);
    }

    const finalizeResult = runCommand("bash", finalizeArgs, { cwd: projectRoot });
    process.exit(finalizeResult.status || 0);
  } finally {
    releasePacketLock(lockHandle);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
