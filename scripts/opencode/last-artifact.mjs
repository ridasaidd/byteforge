import path from "node:path";
import { getArtifactsDir, getLatestArtifactPath } from "./common.mjs";

const artifactPath = getLatestArtifactPath(process.cwd());

if (!artifactPath) {
  console.error(`No artifacts found in ${getArtifactsDir(process.cwd())}`);
  process.exit(1);
}

console.log(path.resolve(artifactPath));
