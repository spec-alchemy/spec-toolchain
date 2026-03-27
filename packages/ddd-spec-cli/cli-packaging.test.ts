import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  CLI_DIST_ENTRY_PATH,
  CLI_DIST_INDEX_PATH,
  CLI_DIST_SCHEMA_DIR_PATH,
  CLI_DIST_SCHEMA_PATH,
  CLI_DIST_VIEWER_DIR_PATH,
  CLI_DIST_VIEWER_GENERATED_SPEC_PATH,
  CLI_DIST_VIEWER_INDEX_PATH,
  REPO_ROOT_PATH,
  SCHEMA_FILE_NAMES
} from "./test-support/cli-test-fixtures.js";
import {
  assertSchemaAssetsMatchCore,
  assertGeneratedVsCodeWorkspaceConfig,
  packPublishedCliTarball,
  runCommand
} from "./test-support/cli-test-helpers.js";

test("CLI package build emits executable dist output and runtime schema assets", async () => {
  await access(CLI_DIST_ENTRY_PATH);
  await access(CLI_DIST_INDEX_PATH);
  await access(CLI_DIST_SCHEMA_PATH);

  for (const schemaFileName of SCHEMA_FILE_NAMES) {
    await access(join(CLI_DIST_SCHEMA_DIR_PATH, schemaFileName));
  }

  await assertSchemaAssetsMatchCore(CLI_DIST_SCHEMA_DIR_PATH);

  const entrySource = await readFile(CLI_DIST_ENTRY_PATH, "utf8");
  const entryStats = await stat(CLI_DIST_ENTRY_PATH);

  assert.match(entrySource, /^#!\/usr\/bin\/env node\n/);
  assert.ok((entryStats.mode & 0o111) !== 0);
});

test("CLI package build emits packaged viewer static assets", async () => {
  await access(CLI_DIST_VIEWER_INDEX_PATH);
  await access(CLI_DIST_VIEWER_GENERATED_SPEC_PATH);

  const indexSource = await readFile(CLI_DIST_VIEWER_INDEX_PATH, "utf8");
  const builtAssetNames = await readdir(join(CLI_DIST_VIEWER_DIR_PATH, "assets"));

  assert.match(indexSource, /\.\/assets\//);
  assert.ok(builtAssetNames.some((fileName) => fileName.endsWith(".js")));
  assert.ok(builtAssetNames.some((fileName) => fileName.endsWith(".css")));
});

test("CLI dist entry runs without tsx or repo source entrypoints", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-dist-cli-"));

  try {
    await runCommand(
      process.execPath,
      [CLI_DIST_ENTRY_PATH, "init"],
      { cwd: tempDir }
    );
    await runCommand(
      process.execPath,
      [CLI_DIST_ENTRY_PATH, "validate"],
      { cwd: tempDir }
    );

    await access(join(tempDir, "ddd-spec", "canonical-vnext", "index.yaml"));
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: tempDir
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("maintainer workspace VS Code schema assets stay in sync with core schema assets", async () => {
  await assertGeneratedVsCodeWorkspaceConfig({
    rootPath: REPO_ROOT_PATH
  });
});

test("npm pack tarball keeps the published CLI package on runtime files only", async () => {
  const packedCliTarball = await packPublishedCliTarball();

  try {
    const packedPaths = packedCliTarball.packedPaths;

    assert.ok(packedPaths.includes("dist/ddd-spec-cli/cli.js"));
    assert.ok(packedPaths.includes("dist/ddd-spec-cli/index.js"));
    for (const schemaFileName of SCHEMA_FILE_NAMES) {
      assert.ok(packedPaths.includes(`dist/ddd-spec-core/schema/${schemaFileName}`));
    }
    assert.ok(packedPaths.includes("dist/ddd-spec-cli/static/viewer/index.html"));
    assert.ok(
      packedPaths.includes("dist/ddd-spec-cli/static/viewer/generated/viewer-spec.json")
    );
    assert.ok(
      packedPaths.some(
        (path) =>
          path.startsWith("dist/ddd-spec-cli/static/viewer/assets/") &&
          path.endsWith(".js")
      )
    );
    assert.ok(!packedPaths.some((path) => path.endsWith(".test.ts")));
    assert.ok(!packedPaths.includes("dist/ddd-spec-cli/static/viewer/generated/.gitkeep"));
    assert.ok(!packedPaths.some((path) => /(^|\/)(docs|examples|fixtures|test)\//.test(path)));
    assert.ok(!packedPaths.some((path) => /(^|\/)apps\//.test(path)));
    assert.ok(!packedPaths.some((path) => /(^|\/)src\//.test(path)));
  } finally {
    await rm(packedCliTarball.tempDirPath, { recursive: true, force: true });
  }
});
