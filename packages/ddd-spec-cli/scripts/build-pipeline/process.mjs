import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export async function runTypescriptCli(options) {
  await runNodeCli({
    ...options,
    cliPath: require.resolve("typescript/bin/tsc")
  });
}

export async function runViteCli(options) {
  await runNodeCli({
    ...options,
    cliPath: join(dirname(require.resolve("vite/package.json")), "bin", "vite.js")
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
