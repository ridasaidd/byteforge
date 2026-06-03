import path from "node:path";
import {
  getArtifactsDir,
  getLatestArtifactPath,
  parseArgs,
  readUtf8,
  validateExecutorResponseSchema,
} from "./common.mjs";

function printUsage() {
  console.error([
    "Usage:",
    "  node scripts/opencode/parse-result.mjs [--artifact <path>] [--json]",
    "",
    "Output:",
    "  success",
    "  failed:<failure_type>",
    "  failed:invalid_schema",
  ].join("\n"));
}

function emitResult(result, args) {
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.status);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    process.exit(0);
  }

  const artifactPath = args.artifact
    ? path.resolve(process.cwd(), String(args.artifact))
    : getLatestArtifactPath(process.cwd());

  if (!artifactPath) {
    console.error(`No artifacts found in ${getArtifactsDir(process.cwd())}`);
    process.exit(1);
  }

  let artifact;
  try {
    artifact = JSON.parse(readUtf8(artifactPath));
  } catch (error) {
    console.error(`Unable to read artifact JSON: ${error.message || String(error)}`);
    process.exit(1);
  }

  const assistantText = String(artifact?.assistantText || "");
  const validation = validateExecutorResponseSchema(assistantText);

  if (!validation.valid) {
    emitResult({
      status: "failed:invalid_schema",
      artifactPath,
      issues: validation.issues,
      taskRef: validation.taskRef || null,
    }, args);
    return;
  }

  if (validation.status === "success") {
    emitResult({
      status: "success",
      artifactPath,
      taskRef: validation.taskRef || null,
    }, args);
    return;
  }

  emitResult({
    status: `failed:${validation.failureType}`,
    artifactPath,
    taskRef: validation.taskRef || null,
  }, args);
}

main();
