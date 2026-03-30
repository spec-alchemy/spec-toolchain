import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirPath = dirname(fileURLToPath(import.meta.url));
const packageDirPath = join(scriptDirPath, "..");
const repoRootPath = join(packageDirPath, "..", "..");
const viewerTsconfigPath = join(repoRootPath, "apps", "ddd-spec-viewer", "tsconfig.json");

const testSteps = [
  {
    label: "package build preparation",
    run: () => runNpm(["run", "build"], packageDirPath, "package build preparation")
  },
  {
    label: "core-facing regressions",
    run: () =>
      runNodeTest(
        ["../ddd-spec-core/*.test.ts", "../ddd-spec-projection-viewer/index.test.ts"],
        packageDirPath,
        "core-facing regressions"
      )
  },
  {
    label: "CLI-facing regressions",
    run: () =>
      runNodeTest(
        [
          "./viewer-dev-session.test.ts",
          "./cli-config.test.ts",
          "./cli-init.test.ts",
          "./cli-packaging.test.ts",
          "./cli-installed-smoke.test.ts",
          "./cli-link.test.ts",
          "./cli-runtime.test.ts"
        ],
        packageDirPath,
        "CLI-facing regressions"
      )
  },
  {
    label: "viewer-facing regressions",
    run: () =>
      runNodeTest(
        ["../../apps/ddd-spec-viewer/test/*.test.ts", "../../apps/ddd-spec-viewer/test/*.test.tsx"],
        packageDirPath,
        "viewer-facing regressions",
        {
          TSX_TSCONFIG_PATH: viewerTsconfigPath
        }
      )
  }
];

for (const step of testSteps) {
  await runTestStep(step.label, step.run);
}

async function runTestStep(label, action) {
  try {
    await action();
  } catch (error) {
    const causeMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`[ddd-spec-cli test] ${label} failed: ${causeMessage}`);
  }
}

async function runNpm(args, cwd, label) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  await runProcess(npmCommand, args, cwd, label);
}

async function runNodeTest(testPaths, cwd, label, extraEnv = {}) {
  await runProcess(
    process.execPath,
    ["--import", "tsx", "--test", ...testPaths],
    cwd,
    label,
    extraEnv
  );
}

async function runProcess(command, args, cwd, label, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...extraEnv
      },
      shell: false,
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`[ddd-spec-cli test] ${label} exited from signal ${signal}`));
        return;
      }

      reject(
        new Error(`[ddd-spec-cli test] ${label} exited with code ${code ?? "unknown"}`)
      );
    });
  });
}
