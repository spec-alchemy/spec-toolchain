import {
  analyzeBusinessSpec,
  loadBusinessSpec,
  type BusinessSpec,
  type BusinessSpecAnalysis,
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics
} from "../ddd-spec-core/index.js";
import { buildBusinessViewerSpec } from "../ddd-spec-projection-viewer/index.js";
import { buildBusinessSpecTypescriptSource } from "../ddd-spec-projection-typescript/index.js";
import {
  removeOutputPath,
  writeJsonArtifact,
  writeTextArtifact
} from "./artifact-io.js";
import { buildUsageText, formatDiagnostic, logArtifact, logInfo, logWarningDiagnostic } from "./console.js";
import { loadDddSpecConfig } from "./config.js";
import { initDddSpec } from "./init.js";

type CliCommand =
  | "init"
  | "validate"
  | "bundle"
  | "analyze"
  | "build"
  | "generate-viewer"
  | "generate-typescript";

interface ParsedCliArgs {
  command?: CliCommand;
  configPath?: string;
  help: boolean;
}

export interface RunCliCommandOptions {
  cwd?: string;
}

interface LoadedSpecContext {
  spec: BusinessSpec;
}

export async function runCliCommand(
  argv: readonly string[],
  options: RunCliCommandOptions = {}
): Promise<void> {
  const parsedArgs = parseCliArgs(argv);

  if (parsedArgs.help || !parsedArgs.command) {
    console.log(buildUsageText());
    return;
  }

  if (parsedArgs.command === "init") {
    if (parsedArgs.configPath) {
      throw new Error("The init command does not accept --config");
    }

    await initDddSpec({
      cwd: options.cwd
    });
    return;
  }

  const config = await loadDddSpecConfig({
    configPath: parsedArgs.configPath,
    cwd: options.cwd
  });

  switch (parsedArgs.command) {
    case "validate":
      await runValidateCommand(config);
      return;
    case "bundle":
      await runBundleCommand(config);
      return;
    case "analyze":
      await runAnalyzeCommand(config);
      return;
    case "build":
      await runBuildCommand(config);
      return;
    case "generate-viewer":
      await runGenerateViewerCommand(config);
      return;
    case "generate-typescript":
      await runGenerateTypescriptCommand(config);
      return;
  }
}

async function runValidateCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<LoadedSpecContext> {
  const loadedSpec = await loadValidatedSpec(config);
  logInfo(`validated canonical spec (${config.spec.entryPath})`);

  return loadedSpec;
}

async function runBundleCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const { spec } = await runValidateCommand(config);
  const bundlePath = requireOutputPath(config.outputs.bundlePath, "outputs.bundle");

  await writeJsonArtifact(bundlePath, spec);
  logArtifact("bundled canonical spec", bundlePath);
}

async function runAnalyzeCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<BusinessSpecAnalysis> {
  const { spec } = await runValidateCommand(config);
  const analysis = analyzeBusinessSpec(spec);
  const analysisPath = requireOutputPath(config.outputs.analysisPath, "outputs.analysis");

  await writeJsonArtifact(analysisPath, analysis);
  emitAnalysisDiagnostics(analysis);
  assertNoAnalysisErrors(analysis);
  logArtifact("wrote analysis", analysisPath);
  logInfo(`analysis passed with ${analysis.summary.warningCount} warning(s)`);

  return analysis;
}

async function runBuildCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const loadedSpec = await runValidateCommand(config);
  const bundlePath = requireOutputPath(config.outputs.bundlePath, "outputs.bundle");

  await writeJsonArtifact(bundlePath, loadedSpec.spec);
  logArtifact("bundled canonical spec", bundlePath);

  const analysis = analyzeBusinessSpec(loadedSpec.spec);
  const analysisPath = requireOutputPath(config.outputs.analysisPath, "outputs.analysis");

  await writeJsonArtifact(analysisPath, analysis);
  emitAnalysisDiagnostics(analysis);
  assertNoAnalysisErrors(analysis);
  logArtifact("wrote analysis", analysisPath);
  logInfo(`analysis passed with ${analysis.summary.warningCount} warning(s)`);

  if (config.projections.typescript) {
    await generateTypescriptSpec(config, loadedSpec.spec);
  } else {
    await cleanupTypescriptOutputs(config);
  }

  if (config.projections.viewer) {
    await generateViewerSpec(config, loadedSpec.spec, analysis);
  } else {
    await cleanupViewerOutputs(config);
  }
}

async function runGenerateViewerCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  assertProjectionEnabled(config, "viewer");

  const loadedSpec = await runValidateCommand(config);
  const analysis = analyzeBusinessSpec(loadedSpec.spec);

  emitAnalysisDiagnostics(analysis);
  assertNoAnalysisErrors(analysis);
  await generateViewerSpec(config, loadedSpec.spec, analysis);
}

async function runGenerateTypescriptCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  assertProjectionEnabled(config, "typescript");

  const { spec } = await runValidateCommand(config);
  await generateTypescriptSpec(config, spec);
}

async function loadValidatedSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<LoadedSpecContext> {
  const spec = await loadBusinessSpec({
    entryPath: config.spec.entryPath,
    validateSemantics: false
  });

  await validateBusinessSpecSchema(spec, { schemaPath: config.schema.path });
  validateBusinessSpecSemantics(spec);

  return {
    spec
  };
}

async function generateTypescriptSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  spec: BusinessSpec
): Promise<void> {
  const typescriptPath = requireOutputPath(
    config.outputs.typescriptPath,
    "outputs.typescript"
  );

  await writeTextArtifact(
    typescriptPath,
    buildBusinessSpecTypescriptSource(spec)
  );
  logArtifact("generated TypeScript spec", typescriptPath);
}

async function generateViewerSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  spec: BusinessSpec,
  analysis: BusinessSpecAnalysis
): Promise<void> {
  const viewerPath = requireOutputPath(config.outputs.viewerPath, "outputs.viewer");
  const viewerSpec = buildBusinessViewerSpec(spec, analysis.graph);

  await writeJsonArtifact(viewerPath, viewerSpec);
  logArtifact("generated viewer spec", viewerPath);

  for (const syncTargetPath of config.viewer.syncTargetPaths) {
    await writeJsonArtifact(syncTargetPath, viewerSpec);
    logArtifact("synced viewer spec", syncTargetPath);
  }
}

async function cleanupTypescriptOutputs(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  await cleanupOutputPaths([config.outputs.typescriptPath], "removed stale TypeScript spec");
}

async function cleanupViewerOutputs(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  await cleanupOutputPaths(
    [config.outputs.viewerPath, ...config.viewer.syncTargetPaths],
    "removed stale viewer output"
  );
}

async function cleanupOutputPaths(
  outputPaths: readonly (string | undefined)[],
  label: string
): Promise<void> {
  for (const outputPath of uniqueDefined(outputPaths)) {
    if (await removeOutputPath(outputPath)) {
      logArtifact(label, outputPath);
    }
  }
}

function assertProjectionEnabled(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  projectionName: keyof Awaited<ReturnType<typeof loadDddSpecConfig>>["projections"]
): void {
  if (config.projections[projectionName]) {
    return;
  }

  throw new Error(
    `Projection ${projectionName} is disabled in ${config.sourceDescription}; enable projections.${projectionName} before running this command`
  );
}

function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const positionals: string[] = [];
  let configPath: string | undefined;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--config") {
      const nextArg = argv[index + 1];

      if (!nextArg) {
        throw new Error("--config requires a path");
      }

      configPath = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positionals.push(arg);
  }

  return {
    command: parseCommand(positionals),
    configPath,
    help
  };
}

function parseCommand(positionals: readonly string[]): CliCommand | undefined {
  if (positionals.length === 0) {
    return undefined;
  }

  if (positionals[0] === "init" && positionals.length === 1) {
    return "init";
  }

  if (positionals[0] === "validate" && positionals.length === 1) {
    return "validate";
  }

  if (positionals[0] === "bundle" && positionals.length === 1) {
    return "bundle";
  }

  if (positionals[0] === "analyze" && positionals.length === 1) {
    return "analyze";
  }

  if (positionals[0] === "build" && positionals.length === 1) {
    return "build";
  }

  if (positionals[0] !== "generate" || positionals.length !== 2) {
    throw new Error(`Unknown command: ${positionals.join(" ")}`);
  }

  switch (positionals[1]) {
    case "viewer":
      return "generate-viewer";
    case "typescript":
      return "generate-typescript";
    default:
      throw new Error(`Unknown generate target: ${positionals[1]}`);
  }
}

function emitAnalysisDiagnostics(analysis: BusinessSpecAnalysis): void {
  for (const diagnostic of analysis.diagnostics) {
    if (diagnostic.severity === "warning") {
      logWarningDiagnostic(diagnostic);
    }
  }
}

function assertNoAnalysisErrors(analysis: BusinessSpecAnalysis): void {
  const errorDiagnostics = analysis.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error"
  );

  if (errorDiagnostics.length === 0) {
    return;
  }

  throw new Error(
    [
      `DDD spec analysis failed with ${errorDiagnostics.length} error(s):`,
      ...errorDiagnostics.map((diagnostic) => formatDiagnostic(diagnostic))
    ].join("\n")
  );
}

function requireOutputPath(outputPath: string | undefined, configKey: string): string {
  if (!outputPath) {
    throw new Error(`DDD spec config must define ${configKey} for this command`);
  }

  return outputPath;
}

function uniqueDefined(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
