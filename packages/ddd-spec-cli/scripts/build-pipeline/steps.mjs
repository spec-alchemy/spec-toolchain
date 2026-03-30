import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { runTypescriptCli, runViteCli } from "./process.mjs";

export async function cleanDistOutput(context) {
  await removePathWithRetry(context.distDirPath);
}

export async function buildCliTypescript(context) {
  await runTypescriptCli({
    args: ["-p", "tsconfig.build.json"],
    cwd: context.packageDirPath,
    label: "CLI TypeScript build"
  });
}

export async function prepareViewerStaticAssets(context) {
  await runTypescriptCli({
    args: ["-p", "tsconfig.json", "--noEmit"],
    cwd: context.viewerAppDirPath,
    label: "viewer typecheck"
  });
  await runViteCli({
    args: ["build", "--base=./", "--outDir", context.viewerStaticOutputPath, "--emptyOutDir"],
    cwd: context.viewerAppDirPath,
    label: "viewer static build"
  });
  await rm(context.viewerGeneratedGitkeepPath, { force: true });
}

export async function copyRuntimeSchemaAssets(context) {
  await mkdir(join(context.distDirPath, "ddd-spec-core"), { recursive: true });
  await rm(context.schemaOutputDirPath, { recursive: true, force: true });
  await cp(context.schemaSourceDirPath, context.schemaOutputDirPath, { recursive: true });
}

export async function finalizeBuildOutput(context) {
  await chmod(context.cliEntryPath, 0o755);
}

async function removePathWithRetry(path) {
  const retryableErrorCodes = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error)) {
        throw error;
      }

      if (!retryableErrorCodes.has(error.code) || attempt === 2) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 50 * (attempt + 1));
      });
    }
  }
}
