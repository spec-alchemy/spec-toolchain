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
const releaseDistTag = await resolveReleaseDistTag();
const releaseStatusCommand = ["run", "check:release:status"];
const releaseVersionCommand = ["run", "ops:release:version"];

await runNpm(releaseStatusCommand, repoRootPath, "check:release:status");

const snapshot = await createSnapshot();

try {
  await runNpm(releaseVersionCommand, repoRootPath, "ops:release:version");
  const publishArgs = ["publish", "--dry-run"];
  const publishLabel =
    releaseDistTag === "latest"
      ? "npm publish --dry-run"
      : `npm publish --dry-run --tag ${releaseDistTag}`;

  if (releaseDistTag !== "latest") {
    publishArgs.push("--tag", releaseDistTag);
  }

  await runNpm(publishArgs, packageRootPath, publishLabel);
} finally {
  await restoreSnapshot(snapshot);
}

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

async function createSnapshot() {
  const changesetFileNames = (await readdir(changesetDirPath))
    .filter((fileName) => fileName.endsWith(".md"))
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

async function restoreSnapshot(snapshot) {
  const currentChangesetFileNames = (await readdir(changesetDirPath))
    .filter((fileName) => fileName.endsWith(".md"))
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

async function runNpm(args, cwd, label) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  await new Promise((resolve, reject) => {
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

      reject(new Error(`${label} exited with code ${code ?? "unknown"}`));
    });
  });
}
