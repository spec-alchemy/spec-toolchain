import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  assertGeneratedInitSkeleton,
  assertGeneratedVsCodeWorkspaceConfig,
  runCommand
} from "./test-support/cli-test-helpers.js";
import { REPO_ROOT_PATH } from "./test-support/cli-test-fixtures.js";

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";

test("ddd-spec-cli workspace registers the public package so a consumer can npm link it", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-npm-link-"));
  const consumerRootPath = join(tempDir, "consumer");
  const npmPrefixPath = join(tempDir, "npm-prefix");
  const npmCachePath = join(tempDir, "npm-cache");
  const packageRootPath = join(REPO_ROOT_PATH, "packages", "ddd-spec-cli");
  const npmEnv = {
    NPM_CONFIG_CACHE: npmCachePath,
    NPM_CONFIG_PREFIX: npmPrefixPath
  };

  try {
    await mkdir(consumerRootPath, { recursive: true });
    await writeFile(
      join(consumerRootPath, "package.json"),
      JSON.stringify(
        {
          name: "ddd-spec-link-consumer",
          private: true
        },
        null,
        2
      ),
      "utf8"
    );

    await runCommand(NPM_COMMAND, ["link"], {
      cwd: packageRootPath,
      env: npmEnv
    });
    await runCommand(NPM_COMMAND, ["link", "@spec-alchemy/ddd-spec"], {
      cwd: consumerRootPath,
      env: npmEnv
    });

    const linkedCliEntryPath = join(
      consumerRootPath,
      "node_modules",
      "@spec-alchemy",
      "ddd-spec",
      "dist",
      "ddd-spec-cli",
      "cli.js"
    );

    await runCommand(process.execPath, [linkedCliEntryPath, "init"], {
      cwd: consumerRootPath
    });
    await runCommand(process.execPath, [linkedCliEntryPath, "editor", "setup"], {
      cwd: consumerRootPath
    });
    await runCommand(process.execPath, [linkedCliEntryPath, "build"], {
      cwd: consumerRootPath
    });

    await assertGeneratedInitSkeleton(consumerRootPath);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: consumerRootPath
    });

    const builtBundle = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as {
      version: number;
    };

    assert.equal(builtBundle.version, 1);
  } finally {
    await runCommand(NPM_COMMAND, ["unlink"], {
      cwd: packageRootPath,
      env: npmEnv
    }).catch(() => undefined);

    await rm(tempDir, { recursive: true, force: true });
  }
});
