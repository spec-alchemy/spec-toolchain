import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parse, type ParseError } from "jsonc-parser";
import { isVnextBusinessSpec, loadCanonicalSpec } from "../../ddd-spec-core/index.js";
import type { ViewerDevSessionStatus } from "../viewer-dev-session.js";
import {
  CORE_SCHEMA_DIR_PATH,
  type PackedCliTarball,
  REPO_ROOT_NODE_MODULES_PATH,
  REPO_ROOT_PATH,
  SCHEMA_FILE_NAMES,
  WORKSPACE_SCHEMA_FILE_NAMES,
  WORKSPACE_SCHEMA_DIR_RELATIVE_PATH
} from "./cli-test-fixtures.js";

export async function copyVnextCanonicalToZeroConfigRoot(
  targetRootPath: string,
  exampleId: "vnext-minimal" | "vnext-cross-context" = "vnext-minimal"
): Promise<void> {
  await cp(
    resolve(REPO_ROOT_PATH, "examples", exampleId, "canonical-vnext"),
    join(targetRootPath, "domain-model"),
    { recursive: true }
  );
}

export function getInstalledCliEntryPath(installedPackagePath: string): string {
  return join(installedPackagePath, "dist", "ddd-spec-cli", "cli.js");
}

export async function packPublishedCliTarball(): Promise<PackedCliTarball> {
  const tempDirPath = await mkdtemp(join(tmpdir(), "ddd-spec-packed-cli-"));
  const npmCacheDir = join(tempDirPath, "npm-cache");

  try {
    const result = await runCommand(
      getNpmCommand(),
      [
        "pack",
        "--json",
        "--ignore-scripts",
        "--pack-destination",
        tempDirPath,
        "--workspace=packages/ddd-spec-cli"
      ],
      {
        cwd: REPO_ROOT_PATH,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir
        }
      }
    );
    const [packSummary] = JSON.parse(result.stdout.trim()) as [
      {
        filename: string;
        files: Array<{
          path: string;
        }>;
      }
    ];
    const tarballPath = join(tempDirPath, packSummary.filename);

    await access(tarballPath);

    return {
      packedPaths: packSummary.files.map((file) => file.path),
      tarballPath,
      tempDirPath
    };
  } catch (error) {
    await rm(tempDirPath, { recursive: true, force: true });
    throw error;
  }
}

export async function installPublishedCliTarball(consumerRootPath: string): Promise<string> {
  const packedCliTarball = await packPublishedCliTarball();
  const installedPackagePath = join(
    consumerRootPath,
    "node_modules",
    "@knowledge-alchemy",
    "ddd-spec"
  );
  const targetNodeModulesPath = join(consumerRootPath, "node_modules");
  const copiedPackages = new Set<string>();

  try {
    await mkdir(installedPackagePath, { recursive: true });
    await runCommand(
      "tar",
      ["-xzf", packedCliTarball.tarballPath, "-C", installedPackagePath, "--strip-components=1"],
      {
        cwd: REPO_ROOT_PATH
      }
    );

    const packageJson = JSON.parse(
      await readFile(join(installedPackagePath, "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>;
    };

    for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
      await copyInstalledDependency({
        copiedPackages,
        packageName: dependencyName,
        targetNodeModulesPath
      });
    }

    return installedPackagePath;
  } finally {
    await rm(packedCliTarball.tempDirPath, { recursive: true, force: true });
  }
}

export async function waitForViewerServer(
  child: ChildProcessWithoutNullStreams
): Promise<URL> {
  return new Promise((resolvePromise, rejectPromise) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      rejectPromise(
        new Error(`Timed out waiting for viewer server\nstdout:\n${stdout}\nstderr:\n${stderr}`)
      );
    }, 15_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;

      const match = stdout.match(/viewer available at (http:\/\/[^\s]+)/);

      if (!match) {
        return;
      }

      clearTimeout(timeout);
      resolvePromise(new URL(match[1]));
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      rejectPromise(
        new Error(
          `Viewer server exited before becoming ready (code: ${code ?? "unknown"}, signal: ${signal ?? "none"})\nstdout:\n${stdout}\nstderr:\n${stderr}`
        )
      );
    });
  });
}

export async function readViewerDevSessionStatus(
  viewerUrl: URL
): Promise<ViewerDevSessionStatus> {
  const response = await fetch(new URL("/__ddd-spec/dev-session", viewerUrl));

  assert.equal(response.status, 200);

  return response.json() as Promise<ViewerDevSessionStatus>;
}

export async function waitForChildExit(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("exit", () => {
      resolvePromise();
    });
  });
}

export function collectChildOutput(child: ChildProcessWithoutNullStreams): {
  stderr: string;
  stdout: string;
} {
  const output = {
    stderr: "",
    stdout: ""
  };

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output.stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output.stderr += chunk;
  });

  return output;
}

export async function waitForCondition(
  condition: (() => boolean | Promise<boolean>),
  timeoutMs = 15_000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime <= timeoutMs) {
    if (await condition()) {
      return;
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 50);
    });
  }

  throw new Error(`Timed out waiting for condition after ${timeoutMs}ms`);
}

export function countMatches(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

export async function readOptionalTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return "";
    }

    throw error;
  }
}

export async function writeBrowserOpenStub(rootPath: string): Promise<void> {
  const binPath = join(rootPath, "bin");
  const stubSource = [
    "#!/bin/sh",
    "printf '%s\\n' \"$1\" >> \"$DDD_SPEC_BROWSER_OPEN_LOG\""
  ].join("\n");

  await mkdir(binPath, { recursive: true });

  for (const commandName of ["open", "xdg-open"]) {
    const commandPath = join(binPath, commandName);

    await writeFile(commandPath, `${stubSource}\n`, "utf8");
    await chmod(commandPath, 0o755);
  }
}

export async function assertGeneratedInitSkeleton(rootPath: string): Promise<void> {
  const modelRootPath = join(rootPath, "domain-model");
  const requiredPaths = [
    join(modelRootPath, "index.yaml"),
    join(modelRootPath, "contexts"),
    join(modelRootPath, "actors"),
    join(modelRootPath, "systems"),
    join(modelRootPath, "scenarios"),
    join(modelRootPath, "messages"),
    join(modelRootPath, "aggregates"),
    join(modelRootPath, "policies"),
    join(modelRootPath, "contexts", "approvals.context.yaml"),
    join(modelRootPath, "actors", "requester.actor.yaml"),
    join(modelRootPath, "actors", "approver.actor.yaml"),
    join(modelRootPath, "systems", "notification-hub.system.yaml"),
    join(modelRootPath, "scenarios", "approval-request-flow.scenario.yaml"),
    join(modelRootPath, "messages", "submit-approval-request.message.yaml"),
    join(modelRootPath, "messages", "approval-request-submitted.message.yaml"),
    join(modelRootPath, "messages", "approve-request.message.yaml"),
    join(modelRootPath, "messages", "approval-request-approved.message.yaml"),
    join(modelRootPath, "messages", "send-approval-notification.message.yaml"),
    join(modelRootPath, "aggregates", "approval-request.aggregate.yaml"),
    join(modelRootPath, "policies", "notify-requester-after-approval.policy.yaml")
  ] as const;

  for (const path of requiredPaths) {
    await access(path);
  }

  const spec = await loadCanonicalSpec({
    entryPath: join(modelRootPath, "index.yaml"),
    validateSemantics: false
  });

  if (!isVnextBusinessSpec(spec)) {
    throw new Error("Expected the init scaffold to load as the default domain model");
  }

  const approvalsContext = mustFind(spec.contexts, (context) => context.id === "approvals");
  const scenario = mustFind(spec.scenarios, (candidate) => candidate.id === "approval-request-flow");
  const aggregate = mustFind(spec.aggregates, (candidate) => candidate.id === "approval-request");
  const policy = mustFind(
    spec.policies,
    (candidate) => candidate.id === "notify-requester-after-approval"
  );

  assert.equal(spec.id, "approval-flow");
  assert.equal(spec.version, 1);
  assert.deepEqual(spec.contexts.map((context) => context.id), ["approvals"]);
  assert.deepEqual(
    sortStrings(spec.actors.map((actor) => actor.id)),
    sortStrings(["requester", "approver"])
  );
  assert.deepEqual(spec.systems.map((system) => system.id), ["notification-hub"]);
  assert.deepEqual(spec.scenarios.map((candidate) => candidate.id), ["approval-request-flow"]);
  assert.deepEqual(
    sortStrings(spec.messages.map((message) => message.id)),
    sortStrings([
      "submit-approval-request",
      "approval-request-submitted",
      "approve-request",
      "approval-request-approved",
      "send-approval-notification"
    ])
  );
  assert.deepEqual(spec.aggregates.map((candidate) => candidate.id), ["approval-request"]);
  assert.deepEqual(spec.policies.map((candidate) => candidate.id), [
    "notify-requester-after-approval"
  ]);
  assert.equal(approvalsContext.relationships?.[0]?.target.kind, "system");
  assert.equal(approvalsContext.relationships?.[0]?.target.id, "notification-hub");
  assert.equal(scenario.ownerContext, "approvals");
  assert.deepEqual(
    scenario.steps.map((step) => step.id),
    ["draft-request", "awaiting-review", "request-approved"]
  );
  assert.deepEqual(scenario.steps[0]?.outgoingMessages, ["submit-approval-request"]);
  assert.deepEqual(scenario.steps[1]?.incomingMessages, ["approval-request-submitted"]);
  assert.deepEqual(scenario.steps[1]?.outgoingMessages, ["approve-request"]);
  assert.equal(scenario.steps[2]?.final, true);
  assert.equal(scenario.steps[2]?.outcome, "request-approved");
  assert.equal(aggregate.context, "approvals");
  assert.equal(aggregate.lifecycleComplexity, true);
  assert.deepEqual(aggregate.states, ["draft", "submitted", "approved"]);
  assert.equal(aggregate.initialState, "draft");
  assert.deepEqual(
    aggregate.transitions.map((transition) => transition.onMessage),
    ["submit-approval-request", "approve-request"]
  );
  assert.deepEqual(policy.triggerMessages, ["approval-request-approved"]);
  assert.deepEqual(policy.emittedMessages, ["send-approval-notification"]);
  assert.deepEqual(policy.targetSystems, ["notification-hub"]);
}

export async function assertGeneratedVsCodeWorkspaceConfig(options: {
  rootPath: string;
  skippedSchemaFiles?: readonly string[];
}): Promise<void> {
  const schemaRootPath = join(options.rootPath, WORKSPACE_SCHEMA_DIR_RELATIVE_PATH);
  const settingsPath = join(options.rootPath, ".vscode", "settings.json");
  const extensionsPath = join(options.rootPath, ".vscode", "extensions.json");
  const settings = parseJsoncObject(await readFile(settingsPath, "utf8"));
  const extensions = parseJsoncObject(await readFile(extensionsPath, "utf8"));
  const yamlSchemas = normalizeYamlSchemaMappings(settings["yaml.schemas"]);
  const recommendations = normalizeStringList(extensions.recommendations);

  for (const schemaFileName of WORKSPACE_SCHEMA_FILE_NAMES) {
    await access(join(schemaRootPath, schemaFileName));
  }

  await assertSchemaAssetsMatchCore(schemaRootPath, WORKSPACE_SCHEMA_FILE_NAMES);

  assertHasExpectedYamlSchemaMappings({
    rootPath: options.rootPath,
    schemaRootPath,
    yamlSchemas,
    skippedSchemaFiles: options.skippedSchemaFiles
  });
  assert.ok(recommendations.includes("redhat.vscode-yaml"));
  assert.equal(
    recommendations.filter((recommendation) => recommendation === "redhat.vscode-yaml").length,
    1
  );
}

export async function assertSchemaAssetsMatchCore(
  schemaRootPath: string,
  schemaFileNames: readonly string[] = SCHEMA_FILE_NAMES
): Promise<void> {
  for (const schemaFileName of schemaFileNames) {
    const [actual, expected] = await Promise.all([
      readFile(join(schemaRootPath, schemaFileName), "utf8"),
      readFile(join(CORE_SCHEMA_DIR_PATH, schemaFileName), "utf8")
    ]);

    assert.equal(actual, expected, `${schemaFileName} drifted from the core schema asset`);
  }
}

export function parseJsoncObject(source: string): Record<string, unknown> {
  const errors: ParseError[] = [];
  const parsed = parse(source, errors, {
    allowTrailingComma: true,
    disallowComments: false
  });

  assert.deepEqual(errors, []);
  assert.ok(parsed && typeof parsed === "object" && !Array.isArray(parsed));

  return parsed as Record<string, unknown>;
}

export function normalizeYamlSchemaMappings(value: unknown): Record<string, readonly string[]> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([schemaPath, globs]) => [
      schemaPath,
      normalizeStringList(globs)
    ])
  );
}

export function normalizeStringList(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }

  assert.ok(Array.isArray(value));
  assert.ok(value.every((entry) => typeof entry === "string"));

  return value as readonly string[];
}

export function toWorkspaceSchemaPath(rootPath: string, schemaPath: string): string {
  const relativePath = relative(rootPath, schemaPath).replace(/\\/g, "/");

  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    relativePath.startsWith("/")
  ) {
    return relativePath;
  }

  return `./${relativePath}`;
}

export async function runCommandResult(
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<{
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      resolvePromise({
        exitCode: code,
        signal,
        stdout,
        stderr
      });
    });
  });
}

export async function runCommand(
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<{
  stdout: string;
  stderr: string;
}> {
  const result = await runCommandResult(command, args, options);

  if (result.exitCode === 0) {
    return {
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  if (result.signal) {
    throw new Error(`${command} exited from signal ${result.signal}\n${result.stderr}`);
  }

  throw new Error(
    `${command} ${args.join(" ")} exited with code ${result.exitCode ?? "unknown"}\n${result.stderr}`
  );
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort();
}

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error("Expected value to exist");
  }

  return value;
}

async function copyInstalledDependency(options: {
  copiedPackages: Set<string>;
  packageName: string;
  targetNodeModulesPath: string;
}): Promise<void> {
  if (options.copiedPackages.has(options.packageName)) {
    return;
  }

  options.copiedPackages.add(options.packageName);

  const sourcePackagePath = resolveNodeModulesPackagePath(
    REPO_ROOT_NODE_MODULES_PATH,
    options.packageName
  );
  const targetPackagePath = resolveNodeModulesPackagePath(
    options.targetNodeModulesPath,
    options.packageName
  );
  const dependencyPackageJson = JSON.parse(
    await readFile(join(sourcePackagePath, "package.json"), "utf8")
  ) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  await mkdir(dirname(targetPackagePath), { recursive: true });
  await cp(sourcePackagePath, targetPackagePath, {
    recursive: true,
    dereference: true
  });

  for (const dependencyName of Object.keys({
    ...dependencyPackageJson.dependencies,
    ...dependencyPackageJson.optionalDependencies
  })) {
    await copyInstalledDependency({
      copiedPackages: options.copiedPackages,
      packageName: dependencyName,
      targetNodeModulesPath: options.targetNodeModulesPath
    });
  }
}

function resolveNodeModulesPackagePath(nodeModulesPath: string, packageName: string): string {
  return join(nodeModulesPath, ...packageName.split("/"));
}

function assertHasExpectedYamlSchemaMappings(options: {
  rootPath: string;
  schemaRootPath: string;
  yamlSchemas: Record<string, readonly string[]>;
  skippedSchemaFiles?: readonly string[];
}): void {
  const expectedMappings = buildExpectedYamlSchemaMappings();
  const skippedSchemaFiles = new Set(options.skippedSchemaFiles ?? []);

  for (const [schemaFileName, expectedGlobs] of Object.entries(expectedMappings)) {
    if (skippedSchemaFiles.has(schemaFileName)) {
      continue;
    }

    const schemaPath = toWorkspaceSchemaPath(
      options.rootPath,
      join(options.schemaRootPath, schemaFileName)
    );

    assert.deepEqual(options.yamlSchemas[schemaPath], expectedGlobs);
  }
}

function buildExpectedYamlSchemaMappings(): Record<string, readonly string[]> {
  return {
    "vnext/canonical-index.schema.json": ["**/domain-model/index.yaml"],
    "vnext/context.schema.json": ["**/domain-model/contexts/*.context.yaml"],
    "vnext/actor.schema.json": ["**/domain-model/actors/*.actor.yaml"],
    "vnext/system.schema.json": ["**/domain-model/systems/*.system.yaml"],
    "vnext/scenario.schema.json": ["**/domain-model/scenarios/*.scenario.yaml"],
    "vnext/message.schema.json": ["**/domain-model/messages/*.message.yaml"],
    "vnext/aggregate.schema.json": ["**/domain-model/aggregates/*.aggregate.yaml"],
    "vnext/policy.schema.json": ["**/domain-model/policies/*.policy.yaml"]
  };
}

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
