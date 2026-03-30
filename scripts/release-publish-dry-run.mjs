import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirPath = dirname(fileURLToPath(import.meta.url));
const repoRootPath = join(rootDirPath, "..");
const packageRootPath = join(repoRootPath, "packages", "ddd-spec-cli");
const releaseDistTag = await resolveReleaseDistTag();
const publishArgs = ["publish", "--dry-run"];
const publishLabel =
  releaseDistTag === "latest"
    ? "ops:release:publish-dry-run"
    : `ops:release:publish-dry-run --tag ${releaseDistTag}`;

if (releaseDistTag !== "latest") {
  publishArgs.push("--tag", releaseDistTag);
}

await runNpm(publishArgs, packageRootPath, publishLabel);

async function resolveReleaseDistTag() {
  const branchName = await readGitBranchName();
  return branchName === "beta" ? "beta" : "latest";
}

async function readGitBranchName() {
  return new Promise((resolve) => {
    const child = spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repoRootPath,
      stdio: ["ignore", "pipe", "ignore"]
    });

    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.once("error", () => resolve("HEAD"));
    child.once("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || "HEAD");
        return;
      }

      resolve("HEAD");
    });
  });
}

async function runNpm(args, cwd, label) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  return await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd,
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`${label} exited from signal ${signal}`));
        return;
      }

      reject(
        new Error(
          `[release-publish-dry-run] Publish simulation failed for dist-tag ${releaseDistTag}.`
        )
      );
    });
  });
}
