import {
  analyzeBusinessSpec,
  analyzeVnextBusinessSpec,
  isVnextBusinessSpec,
  loadCanonicalSpec,
  type BusinessSpecAnalysis,
  type LoadedBusinessSpec,
  type VnextBusinessSpecAnalysis,
  validateBusinessSpecSchema,
  validateVnextCanonicalSchema,
  validateBusinessSpecSemantics
} from "../ddd-spec-core/index.js";
import {
  buildBusinessViewerSpec,
  buildVnextViewerSpec
} from "../ddd-spec-projection-viewer/index.js";
import { buildBusinessSpecTypescriptSource } from "../ddd-spec-projection-typescript/index.js";
import {
  removeOutputPath,
  writeJsonArtifact,
  writeTextArtifact
} from "./artifact-io.js";
import { buildUsageText, formatDiagnostic, logArtifact, logInfo, logWarningDiagnostic } from "./console.js";
import { DEFAULT_SCHEMA_PATH, DEFAULT_VNEXT_SCHEMA_PATH } from "./config.js";
import { loadDddSpecConfig } from "./config.js";
import { startDddSpecDevSession } from "./dev.js";
import { initDddSpec } from "./init.js";
import { startDddSpecViewer, type ViewerCommandHooks } from "./viewer.js";

type CliCommand =
  | "init"
  | "validate"
  | "bundle"
  | "analyze"
  | "build"
  | "dev"
  | "viewer"
  | "generate-viewer"
  | "generate-typescript";

interface ParsedCliArgs {
  command?: CliCommand;
  configPath?: string;
  help: boolean;
  templateId?: string;
  passthroughArgs: readonly string[];
}

export interface RunCliCommandOptions {
  cwd?: string;
  viewerCommandHooks?: ViewerCommandHooks;
}

interface LoadedSpecContext {
  spec: LoadedBusinessSpec;
}

type LoadedSpecAnalysis = BusinessSpecAnalysis | VnextBusinessSpecAnalysis;

export async function runCliCommand(
  argv: readonly string[],
  options: RunCliCommandOptions = {}
): Promise<void> {
  const parsedArgs = parseCliArgs(argv);

  if (parsedArgs.help || !parsedArgs.command) {
    if (!parsedArgs.help && parsedArgs.templateId) {
      throw new Error("The --template option requires the init command");
    }

    console.log(buildUsageText());
    return;
  }

  if (parsedArgs.command === "init") {
    if (parsedArgs.configPath) {
      throw new Error("The init command does not accept --config");
    }

    await initDddSpec({
      cwd: options.cwd,
      templateId: parsedArgs.templateId
    });
    return;
  }

  if (parsedArgs.templateId) {
    throw new Error("The --template option is only supported by the init command");
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
    case "dev":
      await runDevCommand(config, parsedArgs.passthroughArgs, options);
      return;
    case "viewer":
      await runViewerCommand(config, parsedArgs.passthroughArgs, options);
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
): Promise<LoadedSpecAnalysis> {
  const { spec } = await runValidateCommand(config);
  const analysis = analyzeSpec(spec);
  const analysisPath = requireOutputPath(config.outputs.analysisPath, "outputs.analysis");

  await writeJsonArtifact(analysisPath, analysis);
  emitAnalysisDiagnostics(analysis);
  assertNoAnalysisErrors(analysis);
  logArtifact("wrote analysis", analysisPath);
  logInfo(formatAnalysisSuccessMessage(analysis));

  return analysis;
}

async function runBuildCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const loadedSpec = await runValidateCommand(config);
  const bundlePath = requireOutputPath(config.outputs.bundlePath, "outputs.bundle");

  await writeJsonArtifact(bundlePath, loadedSpec.spec);
  logArtifact("bundled canonical spec", bundlePath);

  const analysis = analyzeSpec(loadedSpec.spec);
  const analysisPath = requireOutputPath(config.outputs.analysisPath, "outputs.analysis");

  await writeJsonArtifact(analysisPath, analysis);
  emitAnalysisDiagnostics(analysis);
  assertNoAnalysisErrors(analysis);
  logArtifact("wrote analysis", analysisPath);
  logInfo(formatAnalysisSuccessMessage(analysis));

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
  const analysis = analyzeSpec(loadedSpec.spec);

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

async function runViewerCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  passthroughArgs: readonly string[],
  options: RunCliCommandOptions
): Promise<void> {
  assertProjectionEnabled(config, "viewer");
  await runBuildCommand(config);
  await startDddSpecViewer(config, {
    args: passthroughArgs,
    hooks: options.viewerCommandHooks
  });
}

async function runDevCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  passthroughArgs: readonly string[],
  options: RunCliCommandOptions
): Promise<void> {
  assertProjectionEnabled(config, "viewer");
  await startDddSpecDevSession(config, {
    args: passthroughArgs,
    hooks: options.viewerCommandHooks,
    rebuild: () => runBuildCommand(config)
  });
}

async function loadValidatedSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<LoadedSpecContext> {
  const spec = await loadCanonicalSpec({
    entryPath: config.spec.entryPath,
    validateSemantics: false
  });

  const schemaPath = resolveSchemaPath(spec, config.schema.path);

  if (isVnextBusinessSpec(spec)) {
    await validateVnextCanonicalSchema({
      entryPath: config.spec.entryPath,
      schemaPath
    });
  } else {
    await validateBusinessSpecSchema(spec, {
      schemaPath
    });
  }
  validateBusinessSpecSemantics(spec);

  return {
    spec
  };
}

async function generateTypescriptSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  spec: LoadedBusinessSpec
): Promise<void> {
  if (isVnextBusinessSpec(spec)) {
    throw new Error(
      "TypeScript projection is not implemented for version 3 canonicals yet. Disable projections.typescript for this config before running build or generate typescript."
    );
  }

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
  spec: LoadedBusinessSpec,
  analysis: LoadedSpecAnalysis
): Promise<void> {
  const viewerPath = requireOutputPath(config.outputs.viewerPath, "outputs.viewer");
  const viewerSpec = isVnextBusinessSpec(spec)
    ? buildVnextViewerSpec(spec, ensureVnextAnalysis(analysis))
    : buildBusinessViewerSpec(spec, ensureLegacyAnalysis(analysis).graph);

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
  let templateId: string | undefined;
  let passthroughArgs: readonly string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      passthroughArgs = argv.slice(index + 1);
      break;
    }

    if (arg === "--config") {
      const nextArg = argv[index + 1];

      if (!nextArg) {
        throw new Error("--config requires a path");
      }

      configPath = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--template") {
      const nextArg = argv[index + 1];

      if (!nextArg) {
        throw new Error("--template requires a template name");
      }

      templateId = nextArg;
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
    help,
    templateId,
    passthroughArgs
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

  if (positionals[0] === "dev" && positionals.length === 1) {
    return "dev";
  }

  if (positionals[0] === "viewer" && positionals.length === 1) {
    return "viewer";
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

function emitAnalysisDiagnostics(analysis: LoadedSpecAnalysis): void {
  if (!("warningCount" in analysis.summary)) {
    return;
  }

  for (const diagnostic of analysis.diagnostics) {
    if (diagnostic.severity === "warning") {
      logWarningDiagnostic(diagnostic);
    }
  }
}

function assertNoAnalysisErrors(analysis: LoadedSpecAnalysis): void {
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

function analyzeSpec(spec: LoadedBusinessSpec): LoadedSpecAnalysis {
  return isVnextBusinessSpec(spec)
    ? analyzeVnextBusinessSpec(spec)
    : analyzeBusinessSpec(spec);
}

function resolveSchemaPath(
  spec: LoadedBusinessSpec,
  configuredSchemaPath: string
): string {
  if (isVnextBusinessSpec(spec) && configuredSchemaPath === DEFAULT_SCHEMA_PATH) {
    return DEFAULT_VNEXT_SCHEMA_PATH;
  }

  return configuredSchemaPath;
}

function ensureLegacyAnalysis(
  analysis: LoadedSpecAnalysis
): BusinessSpecAnalysis {
  if ("graph" in analysis) {
    return analysis;
  }

  throw new Error("Expected legacy graph-based analysis for version 2 canonical");
}

function ensureVnextAnalysis(
  analysis: LoadedSpecAnalysis
): VnextBusinessSpecAnalysis {
  if ("ir" in analysis) {
    return analysis;
  }

  throw new Error("Expected vNext analysis IR for version 3 canonical");
}

function formatAnalysisSuccessMessage(analysis: LoadedSpecAnalysis): string {
  if ("warningCount" in analysis.summary) {
    return `analysis passed with ${analysis.summary.warningCount} warning(s)`;
  }

  return `analysis passed with ${analysis.summary.errorCount} error(s)`;
}
