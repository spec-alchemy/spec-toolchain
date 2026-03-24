import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm, writeFile } from "node:fs/promises";
import {
  resolveDesignSpecPath,
  writeJsonArtifact
} from "../artifact-io.js";
import { buildBusinessGraph } from "../graph-analysis.js";
import { loadBusinessSpec } from "../spec.js";
import { buildBusinessViewerSpec } from "../viewer-spec.js";

const spec = await loadBusinessSpec();
const graph = buildBusinessGraph(spec);
const viewerSpec = buildBusinessViewerSpec(spec, graph);

await rm(resolveDesignSpecPath("artifacts/business-viewer"), {
  force: true,
  recursive: true
});

const jsonOutputPath = await writeJsonArtifact(
  "artifacts/business-viewer/viewer-spec.json",
  viewerSpec
);

const appViewerSpecPath = fileURLToPath(
  new URL("../../../apps/design-spec-viewer/public/generated/viewer-spec.json", import.meta.url)
);

await mkdir(dirname(appViewerSpecPath), { recursive: true });
await writeFile(appViewerSpecPath, `${JSON.stringify(viewerSpec, null, 2)}\n`, "utf8");

console.log(`Generated business viewer spec -> ${jsonOutputPath}`);
console.log(`Synced viewer spec to app -> ${appViewerSpecPath}`);
