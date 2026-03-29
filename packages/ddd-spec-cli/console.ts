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

  if (positionals[0] === "validate" && positionals.length > 1) {
    return `validate-${positionals[1]}`;
  }

  if ((positionals[0] === "editor" || positionals[0] === "config") && positionals.length > 1) {
    return `${positionals[0]}-${positionals[1]}`;
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
    case "validate-schema":
      return "Fix the reported schema issue, then rerun `ddd-spec validate schema`.";
    case "validate-semantics":
      return "Fix the reported semantic rule issue, then rerun `ddd-spec validate semantics`.";
    case "validate-analysis":
      return "Fix the reported analysis issue, then rerun `ddd-spec validate analysis`.";
    case "build":
      return "Fix the reported domain model, analysis, or config issue, then rerun `ddd-spec build`. For the live rebuild loop plus viewer, use `ddd-spec dev`.";
    case "serve":
      return "Fix the reported viewer output or server issue, then rerun `ddd-spec serve`. If the port is busy, retry with `ddd-spec serve -- --port 0`.";
    case "watch":
      return "Fix the reported build issue, then rerun `ddd-spec watch` to resume automatic rebuilds.";
    case "dev":
      return "Fix the reported build or viewer issue, then rerun `ddd-spec dev`. If browser launch is a problem, use `ddd-spec dev -- --no-open`; if the port is busy, use `ddd-spec dev -- --port 0`.";
    case "generate-bundle":
      return "Fix the reported domain model or config issue, then rerun `ddd-spec generate bundle`.";
    case "generate-analysis":
      return "Fix the reported domain model, analysis, or config issue, then rerun `ddd-spec generate analysis`.";
    case "generate-viewer":
      return "Fix the reported domain model, analysis, or config issue, then rerun `ddd-spec generate viewer`.";
    case "generate-typescript":
      return "Fix the reported domain model or config issue, then rerun `ddd-spec generate typescript`.";
    case "clean":
      return "Check the output paths in your config, then rerun `ddd-spec clean`.";
    case "doctor":
      return "Resolve the reported blocking issues, then rerun `ddd-spec doctor`.";
    case "editor-setup":
      return "Fix the reported workspace configuration issue, then rerun `ddd-spec editor setup`.";
    case "config-print":
      return "Fix the reported config issue, then rerun `ddd-spec config print`.";
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
