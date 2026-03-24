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
    "  ddd-spec <command> [--config <path>]",
    "",
    "Commands:",
    "  validate",
    "  bundle",
    "  analyze",
    "  build",
    "  generate viewer",
    "  generate typescript",
    "  generate diagrams"
  ].join("\n");
}
