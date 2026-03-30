import { spawn } from "node:child_process";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirPath = dirname(fileURLToPath(import.meta.url));
const repoRootPath = join(rootDirPath, "..");
const packageRootPath = join(repoRootPath, "packages", "ddd-spec-cli");
const packageJsonPath = join(packageRootPath, "package.json");
const changelogPath = join(packageRootPath, "CHANGELOG.md");
const changesetDirPath = join(repoRootPath, ".changeset");
const releaseStatusCommand = ["run", "check:release:status"];
const releasePackCommand = ["run", "check:release:pack"];
const releaseVersionCommand = ["run", "ops:release:version"];
const publishDryRunCommand = ["run", "ops:release:publish-dry-run"];

const releaseStatusOutput = await runNpm(releaseStatusCommand, repoRootPath, "check:release:status", {
  captureOutput: true
});

if (!hasPendingReleasePlan(releaseStatusOutput)) {
  console.log(
    "[release-dry-run] Changeset status reports no pending package releases; skipping version mutation and publish simulation."
  );
  process.exit(0);
}

const snapshot = await createSnapshot();

try {
  await runNpm(releaseVersionCommand, repoRootPath, "ops:release:version");
  await runNpm(releasePackCommand, repoRootPath, "check:release:pack");
  await runNpm(publishDryRunCommand, repoRootPath, "ops:release:publish-dry-run");
} finally {
  await restoreSnapshot(snapshot);
}

async function createSnapshot() {
  const changesetFileNames = (await readdir(changesetDirPath))
    .filter((fileName) => isReleaseChangesetFile(fileName))
    .sort();

  return {
    changelog: await readFile(changelogPath, "utf8"),
    changesets: await Promise.all(
      changesetFileNames.map(async (fileName) => ({
        content: await readFile(join(changesetDirPath, fileName), "utf8"),
        fileName
      }))
    ),
    packageJson: await readFile(packageJsonPath, "utf8")
  };
}

function isReleaseChangesetFile(fileName) {
  return fileName.endsWith(".md") && fileName !== "README.md";
}

function hasPendingReleasePlan(output) {
  return !output.includes("would release NO packages");
}

async function restoreSnapshot(snapshot) {
  const currentChangesetFileNames = (await readdir(changesetDirPath))
    .filter((fileName) => isReleaseChangesetFile(fileName))
    .sort();
  const expectedFileNames = new Set(snapshot.changesets.map((entry) => entry.fileName));

  await Promise.all(
    currentChangesetFileNames
      .filter((fileName) => !expectedFileNames.has(fileName))
      .map((fileName) => rm(join(changesetDirPath, fileName), { force: true }))
  );

  await Promise.all([
    writeFile(packageJsonPath, snapshot.packageJson, "utf8"),
    writeFile(changelogPath, snapshot.changelog, "utf8"),
    ...snapshot.changesets.map((entry) =>
      writeFile(join(changesetDirPath, entry.fileName), entry.content, "utf8")
    )
  ]);
}

async function runNpm(args, cwd, label, options = {}) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const { captureOutput = false } = options;

  return await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd,
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";

    if (captureOutput) {
      child.stdout.on("data", (chunk) => {
        const text = String(chunk);
        stdout += text;
        process.stdout.write(text);
      });

      child.stderr.on("data", (chunk) => {
        const text = String(chunk);
        stderr += text;
        process.stderr.write(text);
      });
    }

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(`${stdout}${stderr}`);
        return;
      }

      if (signal) {
        reject(new Error(`${label} exited from signal ${signal}`));
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? "unknown"}`));
    });
  });
}
