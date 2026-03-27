import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { runCliCommand } from "./commands.js";
import {
  assertGeneratedInitSkeleton,
  assertGeneratedVsCodeWorkspaceConfig,
  normalizeYamlSchemaMappings,
  parseJsoncObject
} from "./test-support/cli-test-helpers.js";

test("CLI init creates the default domain model starter and build emits the primary viewer graphs", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-"));

  try {
    await runCliCommand(["init"], { cwd: tempDir });

    await assertGeneratedInitSkeleton(tempDir);
    await runCliCommand(["validate"], { cwd: tempDir });
    await runCliCommand(["build"], { cwd: tempDir });

    const bundle = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as {
      version: number;
      id: string;
    };
    const viewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as {
      viewerVersion: number;
      views: Array<{ id: string }>;
    };

    const gitignoreSource = await readFile(join(tempDir, ".gitignore"), "utf8");
    const settingsSource = await readFile(join(tempDir, ".vscode", "settings.json"), "utf8");

    assert.equal(bundle.version, 3);
    assert.equal(viewer.viewerVersion, 1);
    assert.equal(bundle.id, "approval-flow");
    assert.deepEqual(
      viewer.views.slice(0, 4).map((view) => view.id),
      ["context-map", "scenario-story", "message-flow", "lifecycle"]
    );
    assert.ok(viewer.views.some((view) => view.id === "policy-saga"));
    await assert.rejects(
      readFile(join(tempDir, ".ddd-spec", "generated", "business-spec.generated.ts"), "utf8"),
      /ENOENT/
    );
    assert.match(gitignoreSource, /^\.ddd-spec\/$/m);
    assert.doesNotMatch(settingsSource, /node_modules/);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: tempDir
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init rejects the removed --template option", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-template-removed-"));

  try {
    await assert.rejects(
      runCliCommand(["init", "--template", "default"], { cwd: tempDir }),
      /Legacy init templates were removed\. Use plain `ddd-spec init`\./
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init appends .ddd-spec/ to an existing .gitignore", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-gitignore-update-"));
  const gitignorePath = join(tempDir, ".gitignore");

  try {
    await writeFile(gitignorePath, "node_modules/", "utf8");

    await runCliCommand(["init"], { cwd: tempDir });

    const gitignoreSource = await readFile(gitignorePath, "utf8");

    assert.equal(gitignoreSource, "node_modules/\n.ddd-spec/\n");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init does not duplicate an existing .ddd-spec ignore entry", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-gitignore-"));
  const gitignorePath = join(tempDir, ".gitignore");

  try {
    await writeFile(gitignorePath, "node_modules/\n.ddd-spec/\n", "utf8");

    await runCliCommand(["init"], { cwd: tempDir });

    const gitignoreSource = await readFile(gitignorePath, "utf8");
    const gitignoreEntries = gitignoreSource
      .split(/\r?\n/)
      .filter((line) => line.trim() === ".ddd-spec/");

    assert.equal(gitignoreEntries.length, 1);
    assert.match(gitignoreSource, /^node_modules\/$/m);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init merges VS Code workspace settings and extension recommendations", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-vscode-merge-"));
  const vscodeDirPath = join(tempDir, ".vscode");
  const settingsPath = join(vscodeDirPath, "settings.json");
  const extensionsPath = join(vscodeDirPath, "extensions.json");

  try {
    await mkdir(vscodeDirPath, { recursive: true });
    await writeFile(
      settingsPath,
      [
        "{",
        "  // keep the user's settings",
        '  "files.trimTrailingWhitespace": true,',
        '  "yaml.schemas": {',
        '    "https://example.com/existing.schema.json": ["docs/**/*.yaml"]',
        "  }",
        "}"
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      extensionsPath,
      [
        "{",
        "  // keep the user's recommendations",
        '  "recommendations": ["ms-vscode.makefile-tools"]',
        "}"
      ].join("\n"),
      "utf8"
    );

    await runCliCommand(["init"], { cwd: tempDir });

    const settingsSource = await readFile(settingsPath, "utf8");
    const extensionsSource = await readFile(extensionsPath, "utf8");
    const settings = parseJsoncObject(settingsSource);
    const extensions = parseJsoncObject(extensionsSource);
    const yamlSchemas = normalizeYamlSchemaMappings(settings["yaml.schemas"]);

    assert.equal(settings["files.trimTrailingWhitespace"], true);
    assert.deepEqual(yamlSchemas["https://example.com/existing.schema.json"], ["docs/**/*.yaml"]);
    assert.deepEqual(extensions.recommendations, [
      "ms-vscode.makefile-tools",
      "redhat.vscode-yaml"
    ]);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: tempDir
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init skips overlapping existing YAML schema globs", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-vscode-conflict-"));
  const settingsPath = join(tempDir, ".vscode", "settings.json");

  try {
    await mkdir(dirname(settingsPath), { recursive: true });
    await writeFile(
      settingsPath,
      JSON.stringify(
        {
          "yaml.schemas": {
            "https://example.com/custom-domain.schema.json": ["**/domain-model/**/*.yaml"]
          }
        },
        null,
        2
      ).concat("\n"),
      "utf8"
    );

    await runCliCommand(["init"], { cwd: tempDir });

    const settings = parseJsoncObject(await readFile(settingsPath, "utf8"));
    const yamlSchemas = normalizeYamlSchemaMappings(settings["yaml.schemas"]);

    assert.deepEqual(yamlSchemas["https://example.com/custom-domain.schema.json"], [
      "**/domain-model/**/*.yaml"
    ]);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: tempDir,
      skippedSchemaFiles: [
        "vnext/canonical-index.schema.json",
        "vnext/context.schema.json",
        "vnext/actor.schema.json",
        "vnext/system.schema.json",
        "vnext/scenario.schema.json",
        "vnext/message.schema.json",
        "vnext/aggregate.schema.json",
        "vnext/policy.schema.json"
      ]
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init refuses to overwrite an existing domain model index", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-existing-"));
  const entryPath = join(tempDir, "domain-model", "index.yaml");
  const existingSource = "version: 3\n";

  try {
    await mkdir(join(tempDir, "domain-model"), { recursive: true });
    await writeFile(entryPath, existingSource, "utf8");

    await assert.rejects(
      runCliCommand(["init"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Refusing to overwrite existing domain model entry") &&
        error.message.includes(entryPath)
    );

    assert.equal(await readFile(entryPath, "utf8"), existingSource);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
