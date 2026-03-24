import type { AnalysisDiagnostic } from "../ddd-spec-core/graph-analysis.js";

const PREFIX = "[ddd-spec]";

export function logInfo(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

export function logArtifact(label: string, outputPath: string): void {
  console.log(`${PREFIX} ${label} -> ${outputPath}`);
}

export function logWarningDiagnostic(diagnostic: AnalysisDiagnostic): void {
  console.warn(formatDiagnostic(diagnostic));
}

export function formatDiagnostic(diagnostic: AnalysisDiagnostic): string {
  return `${PREFIX} [${diagnostic.severity}] ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`;
}

export function buildUsageText(): string {
  return [
    "Usage:",
    "  ddd-spec <command>",
    "",
    "Defaults:",
    "  Reads ddd-spec/canonical/index.yaml",
    "  Writes build outputs into .ddd-spec/",
    "",
    "Commands:",
    "  init",
    "  validate",
    "  bundle",
    "  analyze",
    "  build",
    "  viewer [-- <viewer-args...>]",
    "  generate viewer",
    "  generate typescript"
  ].join("\n");
}
