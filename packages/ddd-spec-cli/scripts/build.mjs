import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const scriptDirPath = dirname(fileURLToPath(import.meta.url));
const packageDirPath = dirname(scriptDirPath);
const distDirPath = join(packageDirPath, "dist");
const schemaSourcePath = join(
  packageDirPath,
  "..",
  "ddd-spec-core",
  "schema",
  "business-spec.schema.json"
);
const schemaOutputPath = join(
  distDirPath,
  "ddd-spec-core",
  "schema",
  "business-spec.schema.json"
);
const cliEntryPath = join(distDirPath, "ddd-spec-cli", "cli.js");
const viewerAppDirPath = join(packageDirPath, "..", "..", "apps", "ddd-spec-viewer");
const viewerStaticOutputPath = join(
  distDirPath,
  "ddd-spec-cli",
  "static",
  "viewer"
);

await rm(distDirPath, { recursive: true, force: true });
await runTypescriptBuild();
await buildViewerStaticAssets();
await mkdir(join(distDirPath, "ddd-spec-core", "schema"), { recursive: true });
await cp(schemaSourcePath, schemaOutputPath);
await chmod(cliEntryPath, 0o755);

async function runTypescriptBuild() {
  const tscCliPath = require.resolve("typescript/bin/tsc");

  await runNodeCli({
    args: ["-p", "tsconfig.build.json"],
    cliPath: tscCliPath,
    cwd: packageDirPath,
    label: "TypeScript build"
  });
}

async function buildViewerStaticAssets() {
  const tscCliPath = require.resolve("typescript/bin/tsc");
  const viteCliPath = join(
    dirname(require.resolve("vite/package.json")),
    "bin",
    "vite.js"
  );

  await runNodeCli({
    args: ["-p", "tsconfig.json", "--noEmit"],
    cliPath: tscCliPath,
    cwd: viewerAppDirPath,
    label: "viewer typecheck"
  });
  await runNodeCli({
    args: ["build", "--base=./", "--outDir", viewerStaticOutputPath, "--emptyOutDir"],
    cliPath: viteCliPath,
    cwd: viewerAppDirPath,
    label: "viewer static build"
  });
}

async function runNodeCli(options) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [options.cliPath, ...options.args], {
      cwd: options.cwd,
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`${options.label} exited from signal ${signal}`));
        return;
      }

      reject(new Error(`${options.label} exited with code ${code ?? "unknown"}`));
    });
  });
}
