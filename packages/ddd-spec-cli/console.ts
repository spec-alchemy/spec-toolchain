import type { AnalysisDiagnostic } from "../ddd-spec-core/graph-analysis.js";
import { getSupportedInitTemplateIds } from "./init-templates.js";

const PREFIX = "[ddd-spec]";

export function logInfo(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

export function logError(message: string): void {
  console.error(`${PREFIX} ${message}`);
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
  const supportedTemplateIds = getSupportedInitTemplateIds().join(", ");

  return [
    "Usage:",
    "  ddd-spec <command>",
    "",
    "Default workflow:",
    "  ddd-spec init",
    "  edit ddd-spec/canonical/",
    "  ddd-spec dev",
    "",
    "One-shot commands:",
    "  ddd-spec validate",
    "  ddd-spec build",
    "  ddd-spec viewer",
    "",
    "Defaults:",
    "  Reads ddd-spec/canonical/index.yaml",
    "  Writes build outputs into .ddd-spec/",
    "",
    "Advanced init templates:",
    "  Most first-time users should stick with plain ddd-spec init",
    "  Use init --template <name> only when you want a different packaged scaffold",
    `  Supported templates: ${supportedTemplateIds}`,
    "",
    "Advanced config:",
    "  Use --config <path> to load a version: 1 DDD spec config file",
    "  init always scaffolds ddd-spec/canonical/ in the current workspace",
    "",
    "Commands:",
    "  init [--template <name>]",
    "  validate [--config <path>]",
    "  bundle [--config <path>]",
    "  analyze [--config <path>]",
    "  build [--config <path>]",
    "  dev [--config <path>] [-- <viewer-args...>]",
    "  viewer [--config <path>] [-- <viewer-args...>]",
    "  generate-viewer [--config <path>]",
    "  generate-typescript [--config <path>]"
  ].join("\n");
}
