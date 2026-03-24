import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { repoRootPath } from "./config.js";

const viewerSpecSourcePath = join(
  repoRootPath,
  ".ddd-spec",
  "artifacts",
  "viewer-spec.json"
);
const viewerSpecTargetPath = join(
  repoRootPath,
  "apps",
  "design-spec-viewer",
  "public",
  "generated",
  "viewer-spec.json"
);

await mkdir(dirname(viewerSpecTargetPath), { recursive: true });
await copyFile(viewerSpecSourcePath, viewerSpecTargetPath);
