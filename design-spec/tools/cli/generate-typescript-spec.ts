import { writeTextArtifact } from "../artifact-io.js";
import { loadBusinessSpec } from "../spec.js";

const businessSpec = await loadBusinessSpec();
const outputPath = await writeTextArtifact(
  "generated/business-spec.generated.ts",
  [
    "// This file is auto-generated. Do not edit by hand.",
    "",
    `export const businessSpec = ${JSON.stringify(businessSpec, null, 2)} as const;`,
    ""
  ].join("\n")
);

console.log(`Generated TypeScript spec -> ${outputPath}`);
