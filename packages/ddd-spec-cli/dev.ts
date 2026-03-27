import type { Dirent, Stats } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { logError, logInfo } from "./console.js";
import type { ResolvedDddSpecConfig } from "./config.js";
import { createViewerDevSessionStatusController } from "./viewer-dev-session.js";
import { startDddSpecViewer, type ViewerCommandHooks } from "./viewer.js";

const DEFAULT_WATCH_INTERVAL_MS = 250;

export interface StartDddSpecDevSessionOptions {
  args?: readonly string[];
  hooks?: ViewerCommandHooks;
  rebuild: () => Promise<void>;
}

interface PollingWatcher {
  close: () => Promise<void>;
}

interface StartPollingWatcherOptions {
  ignoredPaths: readonly string[];
  intervalMs: number;
  onChange: () => Promise<void>;
  rootPath: string;
}

export async function startDddSpecDevSession(
  config: ResolvedDddSpecConfig,
  options: StartDddSpecDevSessionOptions
): Promise<void> {
  const watchRootPath = dirname(config.spec.entryPath);
  const devSessionStatusController = createViewerDevSessionStatusController();

  logInfo("starting dev loop");
  await runBuildAttempt(options.rebuild, devSessionStatusController);

  const watcher = await startPollingWatcher({
    ignoredPaths: collectIgnoredPaths(config, watchRootPath),
    intervalMs: DEFAULT_WATCH_INTERVAL_MS,
    onChange: async () => {
      logInfo("rebuilding after domain model input changes");
      await runBuildAttempt(options.rebuild, devSessionStatusController);
    },
    rootPath: watchRootPath
  });

  logInfo(`watching domain model inputs under ${watchRootPath}`);

  try {
    await startDddSpecViewer(config, {
      args: options.args,
      devSessionStatusProvider: devSessionStatusController,
      hooks: options.hooks,
      openBrowserByDefault: true
    });
  } finally {
    await watcher.close();
  }
}

async function runBuildAttempt(
  rebuild: () => Promise<void>,
  devSessionStatusController: ReturnType<
    typeof createViewerDevSessionStatusController
  >
): Promise<void> {
  try {
    await rebuild();
    devSessionStatusController.markBuildSucceeded();
    logInfo("build passed");
  } catch (error: unknown) {
    devSessionStatusController.markBuildFailed(toErrorMessage(error));
    logError(
      [
        "build failed; watcher remains active",
        toErrorMessage(error),
        "Next: fix the reported domain model or config issue and save again. The next change will trigger another rebuild automatically."
      ].join("\n")
    );
  }
}

async function startPollingWatcher(
  options: StartPollingWatcherOptions
): Promise<PollingWatcher> {
  let currentFingerprint = await createInputFingerprint(
    options.rootPath,
    options.ignoredPaths
  );
  let closed = false;
  let pendingPoll: Promise<void> | undefined;

  const runPoll = async (): Promise<void> => {
    const nextFingerprint = await createInputFingerprint(
      options.rootPath,
      options.ignoredPaths
    );

    if (nextFingerprint === currentFingerprint) {
      return;
    }

    currentFingerprint = nextFingerprint;
    await options.onChange();
  };

  const timer = setInterval(() => {
    if (closed || pendingPoll) {
      return;
    }

    pendingPoll = runPoll()
      .catch((error: unknown) => {
        logError(`watcher polling failed: ${toErrorMessage(error)}`);
      })
      .finally(() => {
        pendingPoll = undefined;
      });
  }, options.intervalMs);

  return {
    close: async () => {
      if (closed) {
        return;
      }

      closed = true;
      clearInterval(timer);
      await pendingPoll;
    }
  };
}

async function createInputFingerprint(
  rootPath: string,
  ignoredPaths: readonly string[]
): Promise<string> {
  const rootStats = await safeStat(rootPath);

  if (!rootStats?.isDirectory()) {
    return "missing";
  }

  const fingerprintLines = ["root:present"];

  await appendDirectoryFingerprint({
    currentPath: rootPath,
    fingerprintLines,
    ignoredPaths,
    rootPath
  });

  return fingerprintLines.join("\n");
}

async function appendDirectoryFingerprint(options: {
  currentPath: string;
  fingerprintLines: string[];
  ignoredPaths: readonly string[];
  rootPath: string;
}): Promise<void> {
  const directoryEntries = await safeReadDir(options.currentPath);

  directoryEntries.sort((left, right) => left.name.localeCompare(right.name));

  for (const directoryEntry of directoryEntries) {
    const entryPath = join(options.currentPath, directoryEntry.name);

    if (isIgnoredPath(options.rootPath, entryPath, options.ignoredPaths)) {
      continue;
    }

    const entryStats = await safeStat(entryPath);

    if (!entryStats) {
      continue;
    }

    const entryRelativePath = toRelativePath(options.rootPath, entryPath);

    if (entryStats.isDirectory()) {
      options.fingerprintLines.push(`dir:${entryRelativePath}`);
      await appendDirectoryFingerprint({
        currentPath: entryPath,
        fingerprintLines: options.fingerprintLines,
        ignoredPaths: options.ignoredPaths,
        rootPath: options.rootPath
      });
      continue;
    }

    options.fingerprintLines.push(
      `file:${entryRelativePath}:${entryStats.size}:${entryStats.mtimeMs.toFixed(3)}`
    );
  }
}

function collectIgnoredPaths(
  config: ResolvedDddSpecConfig,
  watchRootPath: string
): string[] {
  return [
    config.outputs.rootDirPath,
    config.outputs.bundlePath,
    config.outputs.analysisPath,
    config.outputs.viewerPath,
    config.outputs.typescriptPath,
    ...config.viewer.syncTargetPaths
  ].filter((candidatePath): candidatePath is string => {
    if (!candidatePath) {
      return false;
    }

    return isPathInsideRoot(watchRootPath, candidatePath);
  });
}

function isIgnoredPath(
  rootPath: string,
  candidatePath: string,
  ignoredPaths: readonly string[]
): boolean {
  const candidateRelativePath = toRelativePath(rootPath, candidatePath);

  return ignoredPaths.some((ignoredPath) => {
    const ignoredRelativePath = toRelativePath(rootPath, ignoredPath);

    return (
      candidateRelativePath === ignoredRelativePath ||
      candidateRelativePath.startsWith(`${ignoredRelativePath}/`)
    );
  });
}

function isPathInsideRoot(rootPath: string, candidatePath: string): boolean {
  const relativePath = relative(rootPath, candidatePath);

  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith(`..${sep}`) &&
      relativePath !== ".." &&
      !relativePath.startsWith("../"))
  );
}

function toRelativePath(rootPath: string, candidatePath: string): string {
  const relativePath = relative(rootPath, candidatePath);

  return relativePath.split(sep).join("/");
}

async function safeReadDir(path: string): Promise<Dirent[]> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw error;
  }
}

async function safeStat(path: string): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
