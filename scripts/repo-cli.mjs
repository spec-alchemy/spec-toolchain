import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirPath = dirname(fileURLToPath(import.meta.url));
const repoRootPath = join(scriptDirPath, "..");
const packageWorkspace = "packages/ddd-spec-cli";
const flowConfigPathByName = {
  goldens: "packages/ddd-spec-core/test-fixtures/cross-context/ddd-spec.config.yaml",
  viewer: "apps/ddd-spec-viewer/ddd-spec.config.yaml"
};

const [repoCommand, configName, ...forwardedArgs] = process.argv.slice(2);

if (!repoCommand || !configName) {
  throw new Error(
    "[repo-cli] Usage: node ./scripts/repo-cli.mjs <validate|build|serve> <viewer|goldens> [args...]"
  );
}

const configPath = flowConfigPathByName[configName];

if (!configPath) {
  throw new Error(
    `[repo-cli] Unknown maintainer config '${configName}'. Expected one of: ${Object.keys(flowConfigPathByName).join(", ")}.`
  );
}

await runNpm(
  ["run", "build", "--workspace", packageWorkspace],
  "repo package build"
);
await runNpm(
  [
    "run",
    "repo:cli",
    "--workspace",
    packageWorkspace,
    "--",
    repoCommand,
    "--config",
    configPath,
    ...forwardedArgs
  ],
  `repo CLI ${repoCommand}`
);

async function runNpm(args, label) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: repoRootPath,
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`[repo-cli] ${label} exited from signal ${signal}`));
        return;
      }

      reject(new Error(`[repo-cli] ${label} exited with code ${code ?? "unknown"}`));
    });
  });
}
