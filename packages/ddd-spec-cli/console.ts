const PREFIX = "[ddd-spec]";

interface CliDiagnostic {
  severity: string;
  code: string;
  path: string;
  message: string;
}

export function logInfo(message: string): void {
  console.log(prefixMessageLines(message));
}

export function logError(message: string): void {
  console.error(prefixMessageLines(message));
}

export function logArtifact(label: string, outputPath: string): void {
  console.log(`${PREFIX} ${label} -> ${outputPath}`);
}

export function logWarningDiagnostic(diagnostic: CliDiagnostic): void {
  console.warn(formatDiagnostic(diagnostic));
}

export function formatDiagnostic(diagnostic: CliDiagnostic): string {
  return `${PREFIX} [${diagnostic.severity}] ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`;
}

export function buildUsageText(): string {
  return [
    "Usage:",
    "  ddd-spec <command>",
    "",
    "After install, start here:",
    "  ddd-spec init",
    "  edit domain-model/",
    "  ddd-spec dev",
    "",
    "Why this path:",
    "  init scaffolds a domain model starter with context, scenario, message, and lifecycle seams",
    "  dev validates, builds, opens the packaged viewer, and rebuilds on save",
    "",
    "Alternative step-by-step flow:",
    "  ddd-spec validate",
    "  ddd-spec build",
    "  ddd-spec viewer -- --port 4173",
    "",
    "Zero-config defaults:",
    "  Reads domain-model/index.yaml from the current workspace",
    "  Writes bundle, analysis, and viewer outputs into .ddd-spec/",
    "  Keeps TypeScript generation out of the default path",
    "",
    "Advanced config:",
    "  Use --config <path> to load a version: 1 DDD spec config file",
    "  init scaffolds domain-model/ in the current workspace",
    "",
    "Commands:",
    "  init",
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

export function formatCliFailureOutput(
  argv: readonly string[],
  error: unknown
): string {
  const message = toErrorMessage(error);
  const guidance = buildFailureGuidance(inferCommandFromArgv(argv), message);
  const body =
    guidance && !message.includes(guidance)
      ? `${message}\nNext: ${guidance}`
      : message;

  return prefixMessageLines(body);
}

function inferCommandFromArgv(argv: readonly string[]): string | undefined {
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      break;
    }

    if (arg === "--config") {
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h" || arg.startsWith("--")) {
      continue;
    }

    positionals.push(arg);
  }

  if (positionals.length === 0) {
    return undefined;
  }

  if (positionals[0] === "generate" && positionals.length > 1) {
    return `generate-${positionals[1]}`;
  }

  return positionals[0];
}

function buildFailureGuidance(
  command: string | undefined,
  message: string
): string | undefined {
  if (message.includes("Run `ddd-spec init`")) {
    return undefined;
  }

  switch (command) {
    case "validate":
      return "Fix the reported domain model or config issue, then rerun `ddd-spec validate`. After it passes, use `ddd-spec dev` for the watch loop.";
    case "build":
      return "Fix the reported domain model, analysis, or config issue, then rerun `ddd-spec build`. For the live rebuild loop plus viewer, use `ddd-spec dev`.";
    case "viewer":
      return "Fix the reported build or viewer issue, then rerun `ddd-spec viewer`. If the port is busy, retry with `ddd-spec viewer -- --port 0`.";
    case "dev":
      return "Fix the reported build or viewer issue, then rerun `ddd-spec dev`. If browser launch is a problem, use `ddd-spec dev -- --no-open`; if the port is busy, use `ddd-spec dev -- --port 0`.";
    case "generate-viewer":
      return "Fix the reported domain model, analysis, or config issue, then rerun `ddd-spec generate-viewer`.";
    case "generate-typescript":
      return "Fix the reported domain model or config issue, then rerun `ddd-spec generate-typescript`.";
    default:
      return "Run `ddd-spec --help` to see the supported commands and the zero-config init -> dev workflow.";
  }
}

function prefixMessageLines(message: string): string {
  return message
    .split("\n")
    .map((line) => {
      if (line.startsWith(`${PREFIX} `)) {
        return line;
      }

      return `${PREFIX} ${line}`;
    })
    .join("\n");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
