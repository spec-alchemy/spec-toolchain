import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type { ResolvedDddSpecConfig } from "./config.js";

const VIEWER_APP_RELATIVE_PATH = "apps/design-spec-viewer";
const VIEWER_APP_PACKAGE_JSON = "package.json";
const VIEWER_NODE_MODULES_DIR = "node_modules";
const VIEWER_SPEC_DEFAULT_URL_ENV = "VITE_DDD_SPEC_DEFAULT_URL";
const VIEWER_SPEC_DEFAULT_LABEL_ENV = "VITE_DDD_SPEC_DEFAULT_LABEL";

export interface EnsureViewerDependenciesOptions {
  appDirPath: string;
}

export interface LaunchViewerOptions {
  appDirPath: string;
  args: readonly string[];
  defaultSpecLabel: string;
  defaultSpecPath: string;
  defaultSpecUrlPath: string;
}

export interface ViewerCommandHooks {
  ensureViewerDependencies?: (
    options: EnsureViewerDependenciesOptions
  ) => Promise<void>;
  launchViewer?: (options: LaunchViewerOptions) => Promise<void>;
}

export interface StartDddSpecViewerOptions {
  cwd?: string;
  args?: readonly string[];
  hooks?: ViewerCommandHooks;
}

export async function startDddSpecViewer(
  config: ResolvedDddSpecConfig,
  options: StartDddSpecViewerOptions = {}
): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const defaultSpecPath = requireViewerOutputPath(config);
  const appDirPath = resolve(cwd, VIEWER_APP_RELATIVE_PATH);
  const hooks = options.hooks ?? {};

  await assertViewerAppExists(appDirPath);
  await (hooks.ensureViewerDependencies ?? installViewerDependencies)({
    appDirPath
  });
  await (hooks.launchViewer ?? launchViewerProcess)({
    appDirPath,
    args: options.args ?? [],
    defaultSpecLabel: formatViewerSpecLabel(cwd, defaultSpecPath),
    defaultSpecPath,
    defaultSpecUrlPath: toViteFileSystemUrlPath(defaultSpecPath)
  });
}

function requireViewerOutputPath(config: ResolvedDddSpecConfig): string {
  if (config.outputs.viewerPath) {
    return config.outputs.viewerPath;
  }

  throw new Error("DDD spec config must define outputs.viewer for the viewer command");
}

async function assertViewerAppExists(appDirPath: string): Promise<void> {
  const packageJsonPath = join(appDirPath, VIEWER_APP_PACKAGE_JSON);

  if (await pathExists(packageJsonPath)) {
    return;
  }

  throw new Error(
    `Unable to start the shared viewer app because ${packageJsonPath} does not exist`
  );
}

async function installViewerDependencies(
  options: EnsureViewerDependenciesOptions
): Promise<void> {
  if (await pathExists(join(options.appDirPath, VIEWER_NODE_MODULES_DIR))) {
    return;
  }

  await runProcess({
    args: ["install", "--no-fund", "--no-audit"],
    cwd: options.appDirPath,
    label: "viewer dependency install"
  });
}

async function launchViewerProcess(options: LaunchViewerOptions): Promise<void> {
  const runArgs = options.args.length > 0 ? ["run", "dev", "--", ...options.args] : ["run", "dev"];

  await runProcess({
    args: runArgs,
    cwd: options.appDirPath,
    env: {
      ...process.env,
      [VIEWER_SPEC_DEFAULT_LABEL_ENV]: options.defaultSpecLabel,
      [VIEWER_SPEC_DEFAULT_URL_ENV]: options.defaultSpecUrlPath
    },
    label: "viewer process"
  });
}

async function runProcess(options: {
  args: readonly string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  label: string;
}): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(getNpmCommand(), options.args, {
      cwd: options.cwd,
      env: options.env,
      stdio: "inherit"
    });

    child.once("error", (error) => {
      rejectPromise(
        new Error(`Failed to start ${options.label}: ${toErrorMessage(error)}`)
      );
    });

    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      if (signal) {
        rejectPromise(new Error(`${options.label} exited from signal ${signal}`));
        return;
      }

      rejectPromise(
        new Error(`${options.label} exited with code ${code ?? "unknown"}`)
      );
    });
  });
}

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function formatViewerSpecLabel(cwd: string, defaultSpecPath: string): string {
  const relativePath = relative(cwd, defaultSpecPath).split(sep).join("/");

  if (relativePath.length === 0) {
    return "./";
  }

  if (relativePath.startsWith("../") || relativePath === "..") {
    return relativePath;
  }

  return relativePath.startsWith("./") ? relativePath : `./${relativePath}`;
}

function toViteFileSystemUrlPath(path: string): string {
  const normalizedPath = path.split(sep).join("/");
  const rootedPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

  return `/@fs${encodeURI(rootedPath)}`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
