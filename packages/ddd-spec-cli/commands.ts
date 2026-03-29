import { access } from "node:fs/promises";
import type { BusinessViewerSpec, ViewerLocale } from "../ddd-spec-viewer-contract/index.js";
import {
  DEFAULT_VIEWER_LOCALE,
  VIEWER_LOCALES
} from "../ddd-spec-viewer-contract/index.js";
import {
  analyzeBusinessSpec,
  loadCanonicalSpec,
  type BusinessSpec,
  type BusinessSpecAnalysis,
  validateDomainModelWorkspaceSchema,
  validateBusinessSpecSemantics
} from "../ddd-spec-core/index.js";
import { buildViewerSpec } from "../ddd-spec-projection-viewer/index.js";
import { cac } from "cac";
import { removeOutputPath, writeJsonArtifact } from "./artifact-io.js";
import { formatDiagnostic, logArtifact, logInfo } from "./console.js";
import { loadDddSpecConfig } from "./config.js";
import { startDddSpecDevSession, startDddSpecWatchSession } from "./dev.js";
import { ensureVsCodeWorkspaceConfig } from "./editor-config.js";
import { initDddSpec } from "./init.js";
import {
  expandViewerArtifactPaths,
  toViewerLocaleArtifactPath
} from "./viewer-artifacts.js";
import {
  resolveViewerAssetDirPath,
  startDddSpecViewer,
  type ViewerCommandHooks
} from "./viewer.js";

export interface RunCliCommandOptions {
  cwd?: string;
  viewerCommandHooks?: ViewerCommandHooks;
}

interface LoadedSpecContext {
  spec: BusinessSpec;
}

interface LoadedSpecAnalysis extends LoadedSpecContext {
  analysis: BusinessSpecAnalysis;
}

interface CliRunContext {
  options: RunCliCommandOptions;
  passthroughArgs: readonly string[];
}

interface CliCommandOptions {
  config?: string;
}

export async function runCliCommand(
  argv: readonly string[],
  options: RunCliCommandOptions = {}
): Promise<void> {
  const { commandArgv, passthroughArgs } = splitPassthroughArgs(argv);
  const cli = createCli({
    options,
    passthroughArgs
  });

  assertSupportedCommandSurface(commandArgv);

  if (commandArgv.length === 0) {
    cli.outputHelp();
    return;
  }

  if (isUnknownTopLevelCommand(commandArgv)) {
    throw new Error(`Unknown command: ${commandArgv.join(" ")}`);
  }

  cli.parse(["node", "ddd-spec", ...commandArgv], {
    run: false
  });

  if (!cli.matchedCommand) {
    if (isRootHelpRequest(commandArgv) || isGroupedHelpRequest(commandArgv)) {
      return;
    }

    throw new Error(`Unknown command: ${commandArgv.join(" ")}`);
  }

  await cli.runMatchedCommand();
}

function createCli(context: CliRunContext) {
  const cli = cac("ddd-spec");

  cli.usage(
    [
      "<command> [options]",
      "",
      "After install, start here:",
      "  ddd-spec init",
      "  ddd-spec editor setup",
      "  edit domain-model/",
      "  ddd-spec dev",
      "",
      "Why this path:",
      "  init scaffolds a domain model starter with context, scenario, message, and lifecycle seams",
      "  editor setup configures VS Code YAML schema mappings for the workspace",
      "  dev validates, builds, opens the packaged viewer, and rebuilds on save",
      "",
      "Alternative step-by-step flow:",
      "  ddd-spec validate",
      "  ddd-spec build",
      "  ddd-spec serve -- --port 4173",
      "",
      "Zero-config defaults:",
      "  Reads domain-model/index.yaml from the current workspace",
      "  Writes bundle, analysis, and viewer outputs into .ddd-spec/",
      "  Keeps TypeScript generation out of the default path",
      "",
      "Advanced config:",
      "  Use --config <path> to load a version: 1 DDD spec config file",
      "  init scaffolds domain-model/ in the current workspace"
    ].join("\n")
  );
  cli.help();

  cli
    .command("init", "Scaffold the default domain-model workspace")
    .usage("init [options]")
    .example("ddd-spec init")
    .action(async (commandOptions: CliCommandOptions) => {
      if (commandOptions.config) {
        throw new Error("The init command does not accept --config");
      }

      await initDddSpec({
        cwd: context.options.cwd
      });
    });

  cli
    .command("validate [target]", "Validate schema, semantics, and analysis")
    .usage("validate [target] [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec validate")
    .example("ddd-spec validate schema")
    .example("ddd-spec validate semantics --config ./ddd-spec.config.yaml")
    .action(async (target: string | undefined, commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);

      switch (target) {
        case undefined:
          await runValidateCommand(config);
          return;
        case "schema":
          await runValidateSchemaCommand(config);
          return;
        case "semantics":
          await runValidateSemanticsCommand(config);
          return;
        case "analysis":
          await runValidateAnalysisCommand(config);
          return;
        default:
          throw new Error(`Unknown validate target: ${target}`);
      }
    });

  cli
    .command("generate <target>", "Write a generated artifact")
    .usage("generate <target> [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec generate bundle")
    .example("ddd-spec generate analysis")
    .example("ddd-spec generate viewer --config ./ddd-spec.config.yaml")
    .action(async (target: string, commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);

      switch (target) {
        case "bundle":
          await runGenerateBundleCommand(config);
          return;
        case "analysis":
          await runGenerateAnalysisCommand(config);
          return;
        case "viewer":
          await runGenerateViewerCommand(config);
          return;
        case "typescript":
          await runGenerateTypescriptCommand(config);
          return;
        default:
          throw new Error(`Unknown generate target: ${target}`);
      }
    });

  cli
    .command("build", "Validate and generate all configured outputs")
    .usage("build [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec build")
    .action(async (commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);
      await runBuildCommand(config);
    });

  cli
    .command("serve", "Serve the packaged viewer for an existing viewer artifact")
    .usage("serve [options] [-- <viewer-args...>]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec serve -- --port 4173")
    .action(async (commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);
      await runServeCommand(config, context.passthroughArgs, context.options);
    });

  cli
    .command("watch", "Watch domain-model inputs and rebuild on change")
    .usage("watch [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec watch")
    .action(async (commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);
      await runWatchCommand(config);
    });

  cli
    .command("dev", "Build once, watch for changes, and serve the viewer")
    .usage("dev [options] [-- <viewer-args...>]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec dev")
    .example("ddd-spec dev -- --no-open")
    .action(async (commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);
      await runDevCommand(config, context.passthroughArgs, context.options);
    });

  cli
    .command("clean", "Remove generated output artifacts")
    .usage("clean [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec clean")
    .action(async (commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);
      await runCleanCommand(config);
    });

  cli
    .command("doctor", "Diagnose config, inputs, and packaged viewer readiness")
    .usage("doctor [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec doctor")
    .action(async (commandOptions: CliCommandOptions) => {
      const config = await loadResolvedConfig(commandOptions, context.options);
      await runDoctorCommand(config);
    });

  cli
    .command("editor [target]", "Editor integration commands")
    .usage("editor [target]")
    .example("ddd-spec editor setup")
    .action(async (target: string | undefined, commandOptions: CliCommandOptions) => {
      if (commandOptions.config) {
        throw new Error("The editor setup command does not accept --config");
      }

      if (!target) {
        throw new Error("Missing editor target. Run `ddd-spec editor --help` to see the supported commands.");
      }

      if (target !== "setup") {
        throw new Error(`Unknown editor command: editor ${target}`);
      }

      await runEditorSetupCommand(context.options);
    });

  cli
    .command("config [target]", "Config inspection commands")
    .usage("config [target] [options]")
    .option("--config <path>", "Load an explicit ddd-spec config file")
    .example("ddd-spec config print")
    .action(async (target: string | undefined, commandOptions: CliCommandOptions) => {
      if (!target) {
        throw new Error("Missing config target. Run `ddd-spec config --help` to see the supported commands.");
      }

      if (target !== "print") {
        throw new Error(`Unknown config command: config ${target}`);
      }

      const config = await loadResolvedConfig(commandOptions, context.options);
      await runConfigPrintCommand(config);
    });

  return cli;
}

async function loadResolvedConfig(
  commandOptions: CliCommandOptions,
  options: RunCliCommandOptions
) {
  return loadDddSpecConfig({
    configPath: commandOptions.config,
    cwd: options.cwd
  });
}

async function runValidateCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<LoadedSpecAnalysis> {
  const { spec } = await runValidateSemanticsCommand(config);
  const analysis = validateAnalysis(spec);

  logInfo(`validated analysis (${config.spec.entryPath})`);

  return {
    analysis,
    spec
  };
}

async function runValidateSchemaCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  await validateSchema(config);
  logInfo(`validated domain model schema (${config.spec.entryPath})`);
}

async function runValidateSemanticsCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<LoadedSpecContext> {
  const spec = await loadSemanticallyValidSpec(config);
  logInfo(`validated domain model semantics (${config.spec.entryPath})`);

  return {
    spec
  };
}

async function runValidateAnalysisCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<LoadedSpecAnalysis> {
  const { spec } = await runValidateSemanticsCommand(config);
  const analysis = validateAnalysis(spec);

  logInfo(`validated analysis (${config.spec.entryPath})`);

  return {
    analysis,
    spec
  };
}

async function runGenerateBundleCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const { spec } = await runValidateSemanticsCommand(config);
  const bundlePath = requireOutputPath(config.outputs.bundlePath, "outputs.bundle");

  await writeJsonArtifact(bundlePath, spec);
  logArtifact("bundled domain model", bundlePath);
}

async function runGenerateAnalysisCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const { spec, analysis } = await runValidateCommand(config);
  const analysisPath = requireOutputPath(config.outputs.analysisPath, "outputs.analysis");

  await writeJsonArtifact(analysisPath, analysis);
  logArtifact("wrote analysis", analysisPath);
  logInfo(formatAnalysisSuccessMessage(analysis));
  void spec;
}

async function runBuildCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const { spec, analysis } = await runValidateCommand(config);
  const bundlePath = requireOutputPath(config.outputs.bundlePath, "outputs.bundle");
  const analysisPath = requireOutputPath(config.outputs.analysisPath, "outputs.analysis");

  await writeJsonArtifact(bundlePath, spec);
  logArtifact("bundled domain model", bundlePath);

  await writeJsonArtifact(analysisPath, analysis);
  logArtifact("wrote analysis", analysisPath);
  logInfo(formatAnalysisSuccessMessage(analysis));

  if (config.projections.typescript) {
    await generateTypescriptSpec(config, spec);
  } else {
    await cleanupTypescriptOutputs(config);
  }

  if (config.projections.viewer) {
    await generateViewerSpec(config, spec, analysis);
  } else {
    await cleanupViewerOutputs(config);
  }
}

async function runGenerateViewerCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  assertProjectionEnabled(config, "viewer");

  const { spec, analysis } = await runValidateCommand(config);

  await generateViewerSpec(config, spec, analysis);
}

async function runGenerateTypescriptCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  assertProjectionEnabled(config, "typescript");

  const { spec } = await runValidateSemanticsCommand(config);
  await generateTypescriptSpec(config, spec);
}

async function runServeCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  passthroughArgs: readonly string[],
  options: RunCliCommandOptions
): Promise<void> {
  assertProjectionEnabled(config, "viewer");
  await assertViewerOutputReady(config);
  await startDddSpecViewer(config, {
    args: passthroughArgs,
    hooks: options.viewerCommandHooks
  });
}

async function runWatchCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  await startDddSpecWatchSession(config, {
    rebuild: () => runBuildCommand(config)
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

async function runCleanCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  await cleanupOutputPaths(
    [
      config.outputs.bundlePath,
      config.outputs.analysisPath,
      ...expandOptionalViewerArtifactPaths([
        config.outputs.viewerPath,
        ...config.viewer.syncTargetPaths
      ]),
      config.outputs.typescriptPath
    ],
    "removed generated output"
  );
}

async function runDoctorCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const diagnostics: Array<{
    message: string;
    severity: "error" | "info";
  }> = [];

  diagnostics.push({
    message: `config resolved from ${config.sourceDescription}`,
    severity: "info"
  });

  await pushPathDiagnostic(diagnostics, config.spec.entryPath, "domain model entry");
  await pushPathDiagnostic(diagnostics, config.schema.path, "domain model schema");

  if (config.outputs.rootDirPath) {
    diagnostics.push({
      message: `output root resolves to ${config.outputs.rootDirPath}`,
      severity: "info"
    });
  }

  if (config.projections.viewer) {
    try {
      const assetDirPath = await resolveViewerAssetDirPath();

      diagnostics.push({
        message: `packaged viewer assets ready at ${assetDirPath}`,
        severity: "info"
      });
    } catch (error: unknown) {
      diagnostics.push({
        message: toErrorMessage(error),
        severity: "error"
      });
    }

    if (config.outputs.viewerPath) {
      try {
        await access(config.outputs.viewerPath);
        diagnostics.push({
          message: `viewer artifact present at ${config.outputs.viewerPath}`,
          severity: "info"
        });
      } catch {
        diagnostics.push({
          message:
            `viewer artifact missing at ${config.outputs.viewerPath}. Run \`ddd-spec build\` or \`ddd-spec generate viewer\` before \`ddd-spec serve\`.`,
          severity: "error"
        });
      }
    }
  }

  for (const diagnostic of diagnostics) {
    logInfo(`[${diagnostic.severity}] ${diagnostic.message}`);
  }

  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;

  if (errorCount > 0) {
    throw new Error(`doctor found ${errorCount} blocking issue(s)`);
  }
}

async function runEditorSetupCommand(options: RunCliCommandOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const result = await ensureVsCodeWorkspaceConfig(cwd);

  if (result.schemaAssetsStatus === "created") {
    logArtifact("created VS Code YAML schema assets", result.schemaDirPath);
  } else if (result.schemaAssetsStatus === "updated") {
    logInfo("updated .vscode/ddd-spec/schema with YAML schema assets");
  } else if (result.schemaAssetsStatus === "unchanged") {
    logInfo(".vscode/ddd-spec/schema already includes YAML schema assets");
  }

  if (result.settingsStatus === "created") {
    logArtifact("created VS Code YAML schema settings", result.settingsPath);
  } else if (result.settingsStatus === "updated") {
    logInfo("updated .vscode/settings.json with YAML schema mappings");
  } else if (result.settingsStatus === "unchanged") {
    logInfo(".vscode/settings.json already includes YAML schema mappings");
  }

  if (result.extensionsStatus === "created") {
    logArtifact("created VS Code extension recommendations", result.extensionsPath);
  } else if (result.extensionsStatus === "updated") {
    logInfo("updated .vscode/extensions.json with recommended YAML tooling");
  } else if (result.extensionsStatus === "unchanged") {
    logInfo(".vscode/extensions.json already recommends YAML tooling");
  }

  for (const warning of result.warnings) {
    logInfo(`warning: ${warning}`);
  }
}

async function runConfigPrintCommand(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  console.log(`${JSON.stringify(config, null, 2)}\n`);
}

async function validateSchema(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  await validateDomainModelWorkspaceSchema({
    entryPath: config.spec.entryPath,
    schemaPath: config.schema.path
  });
}

async function loadSemanticallyValidSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<BusinessSpec> {
  const spec = await loadCanonicalSpec({
    entryPath: config.spec.entryPath,
    validateSemantics: false
  });

  await validateSchema(config);
  validateBusinessSpecSemantics(spec);

  return spec;
}

function validateAnalysis(spec: BusinessSpec): BusinessSpecAnalysis {
  const analysis = analyzeSpec(spec);

  emitAnalysisDiagnostics(analysis);
  assertNoAnalysisErrors(analysis);

  return analysis;
}

async function assertViewerOutputReady(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>
): Promise<void> {
  const viewerPath = requireOutputPath(config.outputs.viewerPath, "outputs.viewer");

  try {
    await access(viewerPath);
  } catch {
    throw new Error(
      `Missing viewer artifact at ${viewerPath}. Run \`ddd-spec build\` or \`ddd-spec generate viewer\` before \`ddd-spec serve\`.`
    );
  }
}

async function pushPathDiagnostic(
  diagnostics: Array<{
    message: string;
    severity: "error" | "info";
  }>,
  path: string,
  label: string
): Promise<void> {
  try {
    await access(path);
    diagnostics.push({
      message: `${label} present at ${path}`,
      severity: "info"
    });
  } catch {
    diagnostics.push({
      message: `${label} missing at ${path}`,
      severity: "error"
    });
  }
}

function splitPassthroughArgs(argv: readonly string[]): {
  commandArgv: readonly string[];
  passthroughArgs: readonly string[];
} {
  const separatorIndex = argv.indexOf("--");

  if (separatorIndex === -1) {
    return {
      commandArgv: argv,
      passthroughArgs: []
    };
  }

  return {
    commandArgv: argv.slice(0, separatorIndex),
    passthroughArgs: argv.slice(separatorIndex + 1)
  };
}

function assertSupportedCommandSurface(argv: readonly string[]): void {
  if (argv.includes("--template")) {
    throw new Error("Legacy init templates were removed. Use plain `ddd-spec init`.");
  }

  if (argv.length === 0) {
    return;
  }

  const [first, second] = argv;

  if (first === "viewer") {
    throw new Error(
      "The `viewer` command was removed. Use `ddd-spec serve` to serve existing viewer output, or `ddd-spec dev` for the watch-and-serve loop."
    );
  }

  if (first === "bundle") {
    throw new Error(
      "The top-level `bundle` command was removed. Use `ddd-spec generate bundle`."
    );
  }

  if (first === "analyze") {
    throw new Error(
      "The top-level `analyze` command was removed. Use `ddd-spec generate analysis`."
    );
  }

  if (first === "generate-viewer") {
    throw new Error("The `generate-viewer` command was removed. Use `ddd-spec generate viewer`.");
  }

  if (first === "generate-typescript") {
    throw new Error(
      "The `generate-typescript` command was removed. Use `ddd-spec generate typescript`."
    );
  }

  if (first === "editor" && second !== undefined && !isHelpFlag(second) && second !== "setup") {
    throw new Error(`Unknown editor command: editor ${second}`);
  }

  if (first === "config" && second !== undefined && !isHelpFlag(second) && second !== "print") {
    throw new Error(`Unknown config command: config ${second}`);
  }
}

function isHelpFlag(value: string): boolean {
  return value === "--help" || value === "-h";
}

function isUnknownTopLevelCommand(argv: readonly string[]): boolean {
  const first = argv[0];

  if (!first || isHelpFlag(first) || first.startsWith("-")) {
    return false;
  }

  return !new Set([
    "init",
    "validate",
    "generate",
    "build",
    "serve",
    "watch",
    "dev",
    "clean",
    "doctor",
    "editor",
    "config"
  ]).has(first);
}

function isRootHelpRequest(argv: readonly string[]): boolean {
  return argv.length > 0 && argv.every((arg) => isHelpFlag(arg));
}

function isGroupedHelpRequest(argv: readonly string[]): boolean {
  return (
    argv.length === 2 &&
    isHelpFlag(argv[1]) &&
    (argv[0] === "editor" || argv[0] === "config")
  );
}

async function generateTypescriptSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  spec: BusinessSpec
): Promise<void> {
  void config;
  void spec;

  throw new Error(
    "TypeScript projection is not implemented for version 1 domain models yet. Disable projections.typescript for this config before running build or generate typescript."
  );
}

async function generateViewerSpec(
  config: Awaited<ReturnType<typeof loadDddSpecConfig>>,
  spec: BusinessSpec,
  analysis: BusinessSpecAnalysis
): Promise<void> {
  const viewerPath = requireOutputPath(config.outputs.viewerPath, "outputs.viewer");
  const viewerSpecsByLocale = Object.fromEntries(
    VIEWER_LOCALES.map((locale) => [locale, buildViewerSpec(spec, analysis, locale)])
  ) as Record<ViewerLocale, BusinessViewerSpec>;

  await writeViewerArtifacts(viewerPath, viewerSpecsByLocale, "generated viewer spec");

  for (const syncTargetPath of config.viewer.syncTargetPaths) {
    await writeViewerArtifacts(syncTargetPath, viewerSpecsByLocale, "synced viewer spec");
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
    expandOptionalViewerArtifactPaths([
      config.outputs.viewerPath,
      ...config.viewer.syncTargetPaths
    ]),
    "removed stale viewer output"
  );
}

async function writeViewerArtifacts(
  outputPath: string,
  viewerSpecsByLocale: Readonly<Record<ViewerLocale, BusinessViewerSpec>>,
  label: string
): Promise<void> {
  await writeJsonArtifact(outputPath, viewerSpecsByLocale[DEFAULT_VIEWER_LOCALE]);
  logArtifact(label, outputPath);

  for (const locale of VIEWER_LOCALES) {
    const localeOutputPath = toViewerLocaleArtifactPath(outputPath, locale);

    await writeJsonArtifact(localeOutputPath, viewerSpecsByLocale[locale]);
    logArtifact(`${label} (${locale})`, localeOutputPath);
  }
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

function emitAnalysisDiagnostics(analysis: BusinessSpecAnalysis): void {
  void analysis;
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

function expandOptionalViewerArtifactPaths(
  outputPaths: readonly (string | undefined)[]
): readonly string[] {
  return uniqueDefined(outputPaths).flatMap((outputPath) => expandViewerArtifactPaths(outputPath));
}

function analyzeSpec(spec: BusinessSpec): BusinessSpecAnalysis {
  return analyzeBusinessSpec(spec);
}

function formatAnalysisSuccessMessage(analysis: BusinessSpecAnalysis): string {
  return `analysis passed with ${analysis.summary.errorCount} error(s)`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
