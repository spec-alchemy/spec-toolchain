import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildUsageText, formatCliFailureOutput } from "./console.js";
import { loadDddSpecConfig } from "./config.js";
import { runCliCommand } from "./commands.js";
import {
  DEFAULT_SCHEMA_PATH,
  DEFAULT_VNEXT_SCHEMA_PATH,
  EXAMPLE_FIXTURES,
  REPO_ROOT_PATH,
  REPO_VIEWER_ENTRY_PATH,
  REPO_VIEWER_CONFIG_PATH,
  ZERO_CONFIG_FIXTURE
} from "./test-support/cli-test-fixtures.js";
import {
  copyExampleCanonicalToZeroConfigRoot,
  copyVnextCanonicalToZeroConfigRoot,
  countMatches
} from "./test-support/cli-test-helpers.js";

for (const example of EXAMPLE_FIXTURES) {
  test(`${example.id} example config resolves repo-local relative paths`, async () => {
    const config = await loadDddSpecConfig({
      configPath: example.configPath
    });

    assert.equal(config.mode, "config");
    assert.equal(config.sourceDescription, example.configPath);
    assert.equal(config.spec.entryPath, example.entryPath);
    assert.equal(config.projections.viewer, true);
    assert.equal(config.projections.typescript, true);
    assert.equal(config.outputs.rootDirPath, example.expectedPaths.rootDirPath);
    assert.equal(config.outputs.bundlePath, example.expectedPaths.bundlePath);
    assert.equal(config.outputs.analysisPath, example.expectedPaths.analysisPath);
    assert.equal(config.outputs.viewerPath, example.expectedPaths.viewerPath);
    assert.equal(config.outputs.typescriptPath, example.expectedPaths.typescriptPath);
    assert.deepEqual(config.viewer.syncTargetPaths, []);
  });
}

test("zero-config mode resolves the canonical entry and standard outputs from cwd", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-resolve-"));

  try {
    await copyExampleCanonicalToZeroConfigRoot(tempDir, ZERO_CONFIG_FIXTURE.id);

    const config = await loadDddSpecConfig({
      cwd: tempDir
    });

    assert.equal(config.mode, "zero-config");
    assert.equal(config.configPath, undefined);
    assert.equal(config.sourceDescription, "zero-config defaults");
    assert.equal(config.spec.entryPath, join(tempDir, "ddd-spec", "canonical", "index.yaml"));
    assert.equal(config.schema.path, DEFAULT_SCHEMA_PATH);
    assert.equal(config.outputs.rootDirPath, join(tempDir, ".ddd-spec", "artifacts"));
    assert.equal(config.outputs.bundlePath, join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"));
    assert.equal(
      config.outputs.analysisPath,
      join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json")
    );
    assert.equal(config.outputs.viewerPath, join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"));
    assert.equal(
      config.outputs.typescriptPath,
      join(tempDir, ".ddd-spec", "generated", "business-spec.generated.ts")
    );
    assert.equal(config.projections.viewer, true);
    assert.equal(config.projections.typescript, true);
    assert.deepEqual(config.viewer.syncTargetPaths, []);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("zero-config mode prefers canonical-vnext and disables TypeScript by default", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-vnext-resolve-"));

  try {
    await copyVnextCanonicalToZeroConfigRoot(tempDir);

    const config = await loadDddSpecConfig({
      cwd: tempDir
    });

    assert.equal(config.mode, "zero-config");
    assert.equal(config.spec.entryPath, join(tempDir, "ddd-spec", "canonical-vnext", "index.yaml"));
    assert.equal(config.schema.path, DEFAULT_VNEXT_SCHEMA_PATH);
    assert.equal(config.projections.viewer, true);
    assert.equal(config.projections.typescript, false);
    assert.equal(
      config.outputs.typescriptPath,
      join(tempDir, ".ddd-spec", "generated", "business-spec.generated.ts")
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("zero-config validate shows an init hint when the canonical entry is missing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-missing-"));

  try {
    await assert.rejects(
      runCliCommand(["validate"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Run `ddd-spec init`") &&
        error.message.includes(join(tempDir, "ddd-spec", "canonical-vnext", "index.yaml"))
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("zero-config dev shows an init hint when the canonical entry is missing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-missing-dev-"));

  try {
    await assert.rejects(
      runCliCommand(["dev"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Run `ddd-spec init`") &&
        error.message.includes(join(tempDir, "ddd-spec", "canonical-vnext", "index.yaml"))
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI help lists the primary commands and entry points", () => {
  const usageText = buildUsageText();

  assert.match(usageText, /\n  ddd-spec init\n/);
  assert.match(usageText, /\n  ddd-spec dev\n/);
  assert.match(usageText, /\n  init \[--template <name>\]\n/);
  assert.match(usageText, /\n  build \[--config <path>\]\n/);
  assert.match(usageText, /\n  dev \[--config <path>\] \[-- <viewer-args\.\.\.>\]\n/);
  assert.match(usageText, /\bdefault\b/);
  assert.match(usageText, /\bminimal\b/);
  assert.match(usageText, /\border-payment\b/);
  assert.match(usageText, /\n  generate-viewer \[--config <path>\]\n/);
  assert.match(usageText, /generate-typescript \[--config <path>\]$/);
  assert.match(usageText, /ddd-spec\/canonical-vnext/);
  assert.doesNotMatch(usageText, /\n  generate viewer\n/);
  assert.doesNotMatch(usageText, /\n  generate typescript\n/);
});

test("CLI failure output keeps command-specific recovery hints", () => {
  const validateOutput = formatCliFailureOutput(["validate"], new Error("invalid canonical YAML"));
  const viewerOutput = formatCliFailureOutput(
    ["viewer", "--", "--port", "nope"],
    new Error("Viewer port must be an integer between 0 and 65535; received nope")
  );
  const devOutput = formatCliFailureOutput(
    ["dev", "--", "--port", "nope"],
    new Error("Viewer port must be an integer between 0 and 65535; received nope")
  );

  assert.match(validateOutput, /ddd-spec validate/);
  assert.match(validateOutput, /ddd-spec dev/);
  assert.match(viewerOutput, /ddd-spec viewer -- --port 0/);
  assert.match(devOutput, /ddd-spec dev -- --no-open/);
  assert.match(devOutput, /ddd-spec dev -- --port 0/);
});

test("CLI failure output preserves an existing init hint without duplicating guidance", () => {
  const output = formatCliFailureOutput(
    ["validate"],
    new Error(
      "No canonical spec found at /tmp/example/ddd-spec/canonical-vnext/index.yaml. Run `ddd-spec init` to create ddd-spec/canonical-vnext/index.yaml before running this command."
    )
  );

  assert.equal(countMatches(output, "Run `ddd-spec init`"), 1);
});

test("repo viewer config resolves tracked vNext example outputs and sync targets", async () => {
  const config = await loadDddSpecConfig({
    configPath: REPO_VIEWER_CONFIG_PATH
  });

  assert.equal(config.mode, "config");
  assert.equal(config.sourceDescription, REPO_VIEWER_CONFIG_PATH);
  assert.equal(config.spec.entryPath, REPO_VIEWER_ENTRY_PATH);
  assert.equal(config.schema.path, DEFAULT_VNEXT_SCHEMA_PATH);
  assert.equal(config.outputs.rootDirPath, join(REPO_ROOT_PATH, ".ddd-spec", "artifacts"));
  assert.equal(
    config.outputs.bundlePath,
    join(REPO_ROOT_PATH, ".ddd-spec", "artifacts", "business-spec.json")
  );
  assert.equal(
    config.outputs.analysisPath,
    join(REPO_ROOT_PATH, ".ddd-spec", "artifacts", "business-spec.analysis.json")
  );
  assert.equal(
    config.outputs.viewerPath,
    join(REPO_ROOT_PATH, ".ddd-spec", "artifacts", "viewer-spec.json")
  );
  assert.equal(
    config.outputs.typescriptPath,
    join(REPO_ROOT_PATH, ".ddd-spec", "generated", "business-spec.generated.ts")
  );
  assert.equal(config.projections.viewer, true);
  assert.equal(config.projections.typescript, false);
  assert.deepEqual(config.viewer.syncTargetPaths, [
    join(REPO_ROOT_PATH, "apps", "ddd-spec-viewer", "public", "generated", "viewer-spec.json")
  ]);
});
