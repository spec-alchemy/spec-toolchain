import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const rootDirPath = dirname(fileURLToPath(import.meta.url));
const repoRootPath = join(rootDirPath, "..");
const packageRootPath = join(repoRootPath, "packages", "ddd-spec-cli");

const tempDirPath = await mkdtemp(join(tmpdir(), "ddd-spec-release-pack-"));

try {
  const packOutput = await runNpm(
    ["pack", "--json", "--pack-destination", tempDirPath],
    packageRootPath,
    "check:release:pack",
    { captureOutput: true }
  );
  const packSummary = parsePackSummary(packOutput);
  const packedFiles = new Set(packSummary.files.map((file) => file.path));

  assertPackedPath(packedFiles, "dist/ddd-spec-cli/cli.js");
  assertPackedPath(packedFiles, "dist/ddd-spec-cli/static/viewer/index.html");
  assertPackedPath(packedFiles, "README.md");
  assertPackedPath(packedFiles, "package.json");

  const tarballEntries = await readdir(tempDirPath);
  if (!tarballEntries.includes(packSummary.filename)) {
    throw new Error(
      `[release-pack-audit] npm pack did not produce the expected tarball ${packSummary.filename}.`
    );
  }

  console.log(
    `[release-pack-audit] Verified ${packSummary.filename} with ${packSummary.files.length} packed paths.`
  );
} finally {
  await rm(tempDirPath, { force: true, recursive: true });
}

function assertPackedPath(packedFiles, requiredPath) {
  if (!packedFiles.has(requiredPath)) {
    throw new Error(`[release-pack-audit] Missing required tarball path: ${requiredPath}`);
  }
}

function parsePackSummary(output) {
  let parsedOutput;

  try {
    parsedOutput = JSON.parse(extractPackSummaryJson(output));
  } catch (error) {
    throw new Error(
      `[release-pack-audit] Failed to parse npm pack --json output: ${formatError(error)}`
    );
  }

  if (!Array.isArray(parsedOutput) || parsedOutput.length === 0) {
    throw new Error("[release-pack-audit] npm pack --json did not return a pack summary.");
  }

  const [summary] = parsedOutput;

  if (
    typeof summary?.filename !== "string" ||
    !Array.isArray(summary.files) ||
    summary.files.some((file) => typeof file?.path !== "string")
  ) {
    throw new Error("[release-pack-audit] npm pack --json returned an unexpected summary shape.");
  }

  return summary;
}

function extractPackSummaryJson(output) {
  const trimmedOutput = output.trim();
  const jsonStartIndex = trimmedOutput.lastIndexOf("\n[");

  if (jsonStartIndex >= 0) {
    return trimmedOutput.slice(jsonStartIndex + 1);
  }

  if (trimmedOutput.startsWith("[")) {
    return trimmedOutput;
  }

  throw new Error("npm pack output did not contain a trailing JSON summary.");
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
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
        resolve(stdout);
        return;
      }

      if (signal) {
        reject(new Error(`${label} exited from signal ${signal}`));
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? "unknown"}${stderr ? `: ${stderr}` : ""}`));
    });
  });
}
