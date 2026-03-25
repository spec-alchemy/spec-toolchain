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
    "Default workflow:",
    "  ddd-spec init",
    "  edit ddd-spec/canonical/",
    "  ddd-spec validate",
    "  ddd-spec build",
    "  ddd-spec viewer",
    "",
    "Defaults:",
    "  Reads ddd-spec/canonical/index.yaml",
    "  Writes build outputs into .ddd-spec/",
    "",
    "Advanced config:",
    "  Use --config <path> to load a version: 1 DDD spec config file",
    "  init always scaffolds ddd-spec/canonical/ in the current workspace",
    "",
    "Commands:",
    "  init",
    "  validate [--config <path>]",
    "  bundle [--config <path>]",
    "  analyze [--config <path>]",
    "  build [--config <path>]",
    "  viewer [--config <path>] [-- <viewer-args...>]",
    "  generate-viewer [--config <path>]",
    "  generate-typescript [--config <path>]"
  ].join("\n");
}
