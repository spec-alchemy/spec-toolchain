import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildUsageText, formatCliFailureOutput } from "./console.js";
import { loadDddSpecConfig } from "./config.js";
import { runCliCommand } from "./commands.js";
import {
  DEFAULT_VNEXT_SCHEMA_PATH,
  REPO_ROOT_PATH,
  REPO_VIEWER_ENTRY_PATH,
  REPO_VIEWER_CONFIG_PATH
} from "./test-support/cli-test-fixtures.js";
import {
  copyVnextCanonicalToZeroConfigRoot,
  countMatches
} from "./test-support/cli-test-helpers.js";
test("zero-config mode resolves domain-model and disables TypeScript by default", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-vnext-resolve-"));

  try {
    await copyVnextCanonicalToZeroConfigRoot(tempDir);

    const config = await loadDddSpecConfig({
      cwd: tempDir
    });

    assert.equal(config.mode, "zero-config");
    assert.equal(config.configPath, undefined);
    assert.equal(config.sourceDescription, "zero-config defaults");
    assert.equal(config.spec.entryPath, join(tempDir, "domain-model", "index.yaml"));
    assert.equal(config.schema.path, DEFAULT_VNEXT_SCHEMA_PATH);
    assert.equal(config.outputs.rootDirPath, join(tempDir, ".ddd-spec", "artifacts"));
    assert.equal(config.outputs.bundlePath, join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"));
    assert.equal(
      config.outputs.analysisPath,
      join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json")
    );
    assert.equal(config.outputs.viewerPath, join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"));
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

test("zero-config validate shows an init hint when the domain model entry is missing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-missing-"));

  try {
    await assert.rejects(
      runCliCommand(["validate"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Run `ddd-spec init`") &&
        error.message.includes(join(tempDir, "domain-model", "index.yaml"))
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("zero-config dev shows an init hint when the domain model entry is missing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-missing-dev-"));

  try {
    await assert.rejects(
      runCliCommand(["dev"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Run `ddd-spec init`") &&
        error.message.includes(join(tempDir, "domain-model", "index.yaml"))
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("config mode defaults the schema path to the vNext canonical schema", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-vnext-schema-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(
      configPath,
      [
        "version: 1",
        "spec:",
        `  entry: ${JSON.stringify(REPO_VIEWER_ENTRY_PATH)}`,
        "outputs:",
        "  rootDir: ./artifacts",
        "projections:",
        "  viewer: true",
        "  typescript: false"
      ].join("\n").concat("\n"),
      "utf8"
    );

    const config = await loadDddSpecConfig({
      configPath
    });

    assert.equal(config.mode, "config");
    assert.equal(config.schema.path, DEFAULT_VNEXT_SCHEMA_PATH);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI validate rejects unsupported version 2 canonicals in config mode", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-unsupported-version-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");
  const legacyEntryPath = join(tempDir, "legacy-index.yaml");

  try {
    await writeFile(
      legacyEntryPath,
      [
        "version: 2",
        "id: legacy-spec",
        "title: Legacy Spec",
        "summary: Should be rejected.",
        "domain: {}"
      ].join("\n").concat("\n"),
      "utf8"
    );

    await writeFile(
      configPath,
      [
        "version: 1",
        "spec:",
        `  entry: ${JSON.stringify(legacyEntryPath)}`
      ].join("\n").concat("\n"),
      "utf8"
    );

    await assert.rejects(
      runCliCommand(["validate", "--config", configPath], { cwd: tempDir }),
      /ddd-spec only supports version 1 domain models/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI validate rejects legacy version 3 workspaces after the schema reset", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-legacy-version-3-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");
  const legacyEntryPath = join(tempDir, "legacy-index.yaml");

  try {
    await writeFile(
      legacyEntryPath,
      [
        "version: 3",
        "id: legacy-spec",
        "title: Legacy Spec",
        "summary: Should be rejected after the reset.",
        "model:",
        "  contexts: ./contexts",
        "  actors: ./actors",
        "  systems: ./systems",
        "  scenarios: ./scenarios",
        "  messages: ./messages",
        "  aggregates: ./aggregates",
        "  policies: ./policies"
      ].join("\n").concat("\n"),
      "utf8"
    );

    await writeFile(
      configPath,
      [
        "version: 1",
        "spec:",
        `  entry: ${JSON.stringify(legacyEntryPath)}`
      ].join("\n").concat("\n"),
      "utf8"
    );

    await assert.rejects(
      runCliCommand(["validate", "--config", configPath], { cwd: tempDir }),
      /reset the default workspace contract to version 1/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI help lists the primary commands and entry points", () => {
  const usageText = buildUsageText();

  assert.match(usageText, /\n  ddd-spec init\n/);
  assert.match(usageText, /\n  ddd-spec dev\n/);
  assert.match(usageText, /\n  init\n/);
  assert.match(usageText, /\n  build \[--config <path>\]\n/);
  assert.match(usageText, /\n  dev \[--config <path>\] \[-- <viewer-args\.\.\.>\]\n/);
  assert.match(usageText, /\n  generate-viewer \[--config <path>\]\n/);
  assert.match(usageText, /generate-typescript \[--config <path>\]$/);
  assert.match(usageText, /domain-model/);
  assert.doesNotMatch(usageText, /canonical-vnext/);
  assert.doesNotMatch(usageText, /template/);
  assert.doesNotMatch(usageText, /\n  generate viewer\n/);
  assert.doesNotMatch(usageText, /\n  generate typescript\n/);
});

test("CLI failure output keeps command-specific recovery hints", () => {
  const validateOutput = formatCliFailureOutput(["validate"], new Error("invalid domain model"));
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
      "No domain model found at /tmp/example/domain-model/index.yaml. Run `ddd-spec init` to create domain-model/index.yaml before running this command."
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
