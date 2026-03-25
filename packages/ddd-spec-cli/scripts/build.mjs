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

await rm(distDirPath, { recursive: true, force: true });
await runTypescriptBuild();
await mkdir(join(distDirPath, "ddd-spec-core", "schema"), { recursive: true });
await cp(schemaSourcePath, schemaOutputPath);
await chmod(cliEntryPath, 0o755);

async function runTypescriptBuild() {
  const tscCliPath = require.resolve("typescript/bin/tsc");

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tscCliPath, "-p", "tsconfig.build.json"], {
      cwd: packageDirPath,
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`TypeScript build exited from signal ${signal}`));
        return;
      }

      reject(new Error(`TypeScript build exited with code ${code ?? "unknown"}`));
    });
  });
}
