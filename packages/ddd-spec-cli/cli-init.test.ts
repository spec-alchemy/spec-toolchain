import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  loadBusinessSpec,
  validateBusinessSpecSchema
} from "../ddd-spec-core/index.js";
import { runCliCommand } from "./commands.js";
import {
  DEFAULT_SCHEMA_PATH
} from "./test-support/cli-test-fixtures.js";
import {
  assertGeneratedInitSkeleton,
  assertGeneratedVsCodeWorkspaceConfig,
  normalizeYamlSchemaMappings,
  parseJsoncObject
} from "./test-support/cli-test-helpers.js";

test("CLI init creates a teaching approval workflow that validate accepts", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-"));

  try {
    await runCliCommand(["init"], { cwd: tempDir });

    await assertGeneratedInitSkeleton(tempDir);

    const spec = await loadBusinessSpec({
      entryPath: join(tempDir, "ddd-spec", "canonical", "index.yaml"),
      validateSemantics: false
    });

    await validateBusinessSpecSchema(spec, {
      schemaPath: DEFAULT_SCHEMA_PATH
    });
    await runCliCommand(["validate"], { cwd: tempDir });

    const gitignoreSource = await readFile(join(tempDir, ".gitignore"), "utf8");
    const settingsSource = await readFile(join(tempDir, ".vscode", "settings.json"), "utf8");

    assert.match(gitignoreSource, /^\.ddd-spec\/$/m);
    assert.doesNotMatch(settingsSource, /node_modules/);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: tempDir
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init supports explicitly selecting the default template", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-default-template-"));

  try {
    await runCliCommand(["init", "--template", "default"], { cwd: tempDir });

    await assertGeneratedInitSkeleton(tempDir, "default");
    await runCliCommand(["validate"], { cwd: tempDir });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init supports the minimal template and build succeeds", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-minimal-template-"));

  try {
    await runCliCommand(["init", "--template", "minimal"], { cwd: tempDir });

    await assertGeneratedInitSkeleton(tempDir, "minimal");
    await runCliCommand(["build"], { cwd: tempDir });

    const bundle = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as {
      id: string;
      domain: {
        commands: Array<{ type: string }>;
        events: Array<{ type: string }>;
        processes: Array<{ id: string }>;
      };
    };

    assert.equal(bundle.id, "minimal-domain");
    assert.deepEqual(
      bundle.domain.commands.map((command) => command.type),
      ["activateExampleRecord"]
    );
    assert.deepEqual(
      bundle.domain.events.map((event) => event.type),
      ["ExampleRecordActivated"]
    );
    assert.deepEqual(
      bundle.domain.processes.map((process) => process.id),
      ["exampleRecordLifecycle"]
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init supports an example-style order-payment template and build succeeds", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-order-payment-template-"));

  try {
    await runCliCommand(["init", "--template", "order-payment"], { cwd: tempDir });

    await assertGeneratedInitSkeleton(tempDir, "order-payment");
    await runCliCommand(["build"], { cwd: tempDir });

    const bundle = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as {
      id: string;
      domain: {
        processes: Array<{ id: string }>;
      };
    };

    assert.equal(bundle.id, "order-payment");
    assert.deepEqual(
      bundle.domain.processes.map((process) => process.id),
      ["orderPaymentProcess"]
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init rejects unknown template names", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-unknown-template-"));

  try {
    await assert.rejects(
      runCliCommand(["init", "--template", "missing-template"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Unknown init template: missing-template") &&
        error.message.includes("default, minimal, order-payment")
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI rejects --template outside init", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-template-non-init-"));

  try {
    await assert.rejects(
      runCliCommand(["validate", "--template", "minimal"], { cwd: tempDir }),
      /The --template option is only supported by the init command/
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
            "https://example.com/custom-domain.schema.json": ["**/canonical/**/*.yaml"]
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
      "**/canonical/**/*.yaml"
    ]);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: tempDir,
      skippedSchemaFiles: [
        "canonical-index.schema.json",
        "object.schema.json",
        "command.schema.json",
        "event.schema.json",
        "aggregate.schema.json",
        "process.schema.json",
        "viewer-detail-semantics.schema.json"
      ]
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI init refuses to overwrite an existing canonical index", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-existing-"));
  const entryPath = join(tempDir, "ddd-spec", "canonical", "index.yaml");
  const existingSource = "version: 2\n";

  try {
    await mkdir(join(tempDir, "ddd-spec", "canonical"), { recursive: true });
    await writeFile(entryPath, existingSource, "utf8");

    await assert.rejects(
      runCliCommand(["init"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Refusing to overwrite existing canonical entry") &&
        error.message.includes(entryPath)
    );

    assert.equal(await readFile(entryPath, "utf8"), existingSource);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
