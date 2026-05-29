import path from "node:path";
import { getLatestArtifactPath } from "./common.mjs";

const artifactPath = getLatestArtifactPath(process.cwd());

if (!artifactPath) {
  console.error("No artifacts found in storage/opencode-runs");
  process.exit(1);
}

console.log(path.resolve(artifactPath));
