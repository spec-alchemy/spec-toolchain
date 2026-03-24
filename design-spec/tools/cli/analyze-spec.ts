import { writeJsonArtifact } from "../artifact-io.js";
import { analyzeBusinessSpec } from "../graph-analysis.js";
import { loadBusinessSpec } from "../spec.js";

const spec = await loadBusinessSpec();
const analysis = analyzeBusinessSpec(spec);
const errorDiagnostics = analysis.diagnostics.filter(
  (diagnostic) => diagnostic.severity === "error"
);
const formattedErrorDiagnostics = errorDiagnostics.map(
  (diagnostic) =>
    `[${diagnostic.severity}] ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`
);
const outputPath = await writeJsonArtifact("artifacts/business-spec.analysis.json", analysis);

if (analysis.summary.warningCount > 0) {
  for (const diagnostic of analysis.diagnostics) {
    if (diagnostic.severity === "warning") {
      console.warn(
        `[warning] ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`
      );
    }
  }
}

if (analysis.summary.errorCount > 0) {
  throw new Error(
    `Business spec graph analysis failed with ${analysis.summary.errorCount} error(s):\n${formattedErrorDiagnostics.join("\n")}`
  );
}

console.log(
  `Business spec analysis passed with ${analysis.summary.warningCount} warning(s) -> ${outputPath}`
);
