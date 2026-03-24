import { writeJsonArtifact } from "../artifact-io.js";
import { loadBusinessSpec } from "../spec.js";

const spec = await loadBusinessSpec();
const outputPath = await writeJsonArtifact("artifacts/business-spec.json", spec);

console.log(`Bundled canonical spec -> ${outputPath}`);
