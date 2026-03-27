import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type {
  BusinessSpec,
  BusinessSpecAnalysis,
  VnextBusinessSpecAnalysis
} from "../ddd-spec-core/index.js";
import type { BusinessViewerSpec } from "../ddd-spec-viewer-contract/index.js";
import { runCliCommand } from "./commands.js";
import type { LaunchViewerOptions } from "./viewer.js";
import {
  CLI_DIST_VIEWER_DIR_PATH,
  CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH,
  EXAMPLE_FIXTURES,
  ZERO_CONFIG_FIXTURE
} from "./test-support/cli-test-fixtures.js";
import {
  assertExampleAnalysis,
  assertExampleBundle,
  assertExampleViewer,
  copyExampleCanonicalToZeroConfigRoot,
  writeExampleConfig
} from "./test-support/cli-test-helpers.js";
import YAML from "yaml";

const VNEXT_CROSS_CONTEXT_ENTRY_PATH = fileURLToPath(
  new URL("../../examples/vnext-cross-context/canonical-vnext/index.yaml", import.meta.url)
);

test("CLI build syncs viewer spec to configured sync targets", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-sync-targets-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(
      configPath,
      YAML.stringify({
        version: 1,
        spec: {
          entry: CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH
        },
        outputs: {
          rootDir: "./artifacts",
          bundle: "./artifacts/business-spec.json",
          analysis: "./artifacts/business-spec.analysis.json",
          viewer: "./artifacts/viewer-spec.json",
          typescript: "./generated/business-spec.generated.ts"
        },
        viewer: {
          syncTargets: ["./app/public/generated/viewer-spec.json"]
        },
        projections: {
          viewer: true,
          typescript: true
        }
      }),
      "utf8"
    );

    await runCliCommand(["build", "--config", configPath], {
      cwd: tempDir
    });

    const builtViewerSpec = JSON.parse(
      await readFile(join(tempDir, "artifacts", "viewer-spec.json"), "utf8")
    );
    const syncedViewerSpec = JSON.parse(
      await readFile(join(tempDir, "app", "public", "generated", "viewer-spec.json"), "utf8")
    );

    assert.deepEqual(syncedViewerSpec, builtViewerSpec);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI validate succeeds in explicit config mode without writing outputs", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-validate-"));

  try {
    const configPath = await writeExampleConfig({
      rootPath: tempDir,
      example: ZERO_CONFIG_FIXTURE
    });

    await runCliCommand(["validate", "--config", configPath], {
      cwd: tempDir
    });

    await assert.rejects(
      readFile(join(tempDir, "artifacts", "business-spec.json"), "utf8"),
      /ENOENT/
    );
    await assert.rejects(
      readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"), "utf8"),
      /ENOENT/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

for (const example of EXAMPLE_FIXTURES) {
  test(`CLI build succeeds for the ${example.id} example with isolated outputs`, async () => {
    const tempDir = await mkdtemp(join(tmpdir(), `ddd-spec-${example.id}-`));
    const tempConfigPath = join(tempDir, "ddd-spec.config.yaml");

    try {
      await writeFile(
        tempConfigPath,
        YAML.stringify({
          version: 1,
          spec: {
            entry: example.entryPath
          },
          outputs: {
            rootDir: join(tempDir, "artifacts"),
            typescript: join(tempDir, "generated", `${example.id}.generated.ts`)
          },
          projections: {
            viewer: true,
            typescript: true
          }
        }),
        "utf8"
      );

      await runCliCommand(["build", "--config", tempConfigPath]);

      const bundle = JSON.parse(
        await readFile(join(tempDir, "artifacts", "business-spec.json"), "utf8")
      ) as BusinessSpec;
      const analysis = JSON.parse(
        await readFile(join(tempDir, "artifacts", "business-spec.analysis.json"), "utf8")
      ) as BusinessSpecAnalysis;
      const viewer = JSON.parse(
        await readFile(
          join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"),
          "utf8"
        )
      ) as BusinessViewerSpec;
      assertExampleBundle(bundle, example);
      assertExampleAnalysis(analysis, example);
      assertExampleViewer(viewer, example);
      await access(join(tempDir, "generated", `${example.id}.generated.ts`));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
}

test("CLI validate and build succeed in zero-config mode with standard outputs", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-build-"));

  try {
    await copyExampleCanonicalToZeroConfigRoot(tempDir, ZERO_CONFIG_FIXTURE.id);

    await runCliCommand(["validate"], { cwd: tempDir });

    await assert.rejects(
      readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8"),
      /ENOENT/
    );

    await runCliCommand(["build"], { cwd: tempDir });

    const bundle = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as BusinessSpec;
    const analysis = JSON.parse(
      await readFile(
        join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json"),
        "utf8"
      )
    ) as BusinessSpecAnalysis;
    const viewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;
    assertExampleBundle(bundle, ZERO_CONFIG_FIXTURE);
    assertExampleAnalysis(analysis, ZERO_CONFIG_FIXTURE);
    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
    await access(join(tempDir, ".ddd-spec", "generated", "business-spec.generated.ts"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI viewer rebuilds the zero-config viewer artifact and launches the packaged static server", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-viewer-"));
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await copyExampleCanonicalToZeroConfigRoot(tempDir, ZERO_CONFIG_FIXTURE.id);

    await runCliCommand(["viewer", "--", "--host", "0.0.0.0"], {
      cwd: tempDir,
      viewerCommandHooks: {
        launchViewer: async (options) => {
          launchOptions = options;
        }
      }
    });

    assert.ok(launchOptions);
    assert.equal(launchOptions.assetDirPath, CLI_DIST_VIEWER_DIR_PATH);
    assert.equal(launchOptions.viewerSpecPath, join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"));
    assert.equal(launchOptions.host, "0.0.0.0");
    assert.equal(launchOptions.port, 4173);
    assert.equal(launchOptions.openBrowser, false);

    const viewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI viewer rebuilds the explicit-config viewer artifact and launches the packaged static server", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-viewer-"));
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    const configPath = await writeExampleConfig({
      rootPath: tempDir,
      example: ZERO_CONFIG_FIXTURE
    });

    await runCliCommand(["viewer", "--config", configPath, "--", "--host", "0.0.0.0", "--port", "0"], {
      cwd: tempDir,
      viewerCommandHooks: {
        launchViewer: async (options) => {
          launchOptions = options;
        }
      }
    });

    assert.ok(launchOptions);
    assert.equal(launchOptions.assetDirPath, CLI_DIST_VIEWER_DIR_PATH);
    assert.equal(
      launchOptions.viewerSpecPath,
      join(tempDir, "artifacts", "business-viewer", "viewer-spec.json")
    );
    assert.equal(launchOptions.host, "0.0.0.0");
    assert.equal(launchOptions.port, 0);
    assert.equal(launchOptions.openBrowser, false);

    const viewer = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI dev rebuilds the zero-config viewer artifact and enables browser auto-open by default", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-dev-"));
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await copyExampleCanonicalToZeroConfigRoot(tempDir, ZERO_CONFIG_FIXTURE.id);

    await runCliCommand(["dev", "--", "--host", "0.0.0.0"], {
      cwd: tempDir,
      viewerCommandHooks: {
        launchViewer: async (options) => {
          launchOptions = options;
        }
      }
    });

    assert.ok(launchOptions);
    assert.equal(launchOptions.assetDirPath, CLI_DIST_VIEWER_DIR_PATH);
    assert.equal(
      launchOptions.viewerSpecPath,
      join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json")
    );
    assert.equal(launchOptions.host, "0.0.0.0");
    assert.equal(launchOptions.port, 4173);
    assert.equal(launchOptions.openBrowser, true);

    const viewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI build supports version 3 canonicals when viewer projection is enabled without TypeScript output", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-vnext-build-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(
      configPath,
      YAML.stringify({
        version: 1,
        spec: {
          entry: VNEXT_CROSS_CONTEXT_ENTRY_PATH
        },
        outputs: {
          rootDir: "./artifacts"
        },
        projections: {
          viewer: true,
          typescript: false
        }
      }),
      "utf8"
    );

    await runCliCommand(["build", "--config", configPath], {
      cwd: tempDir
    });

    const bundle = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-spec.json"), "utf8")
    ) as BusinessSpec & { version: 3 };
    const analysis = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-spec.analysis.json"), "utf8")
    ) as VnextBusinessSpecAnalysis;
    const viewer = JSON.parse(
      await readFile(
        join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"),
        "utf8"
      )
    ) as BusinessViewerSpec;

    assert.equal(bundle.version, 3);
    assert.equal(analysis.summary.errorCount, 0);
    assert.deepEqual(
      viewer.views.map((view) => view.id),
      ["context-map", "scenario-story", "message-flow", "lifecycle"]
    );
    assert.equal(JSON.stringify(viewer).includes("\"fetch-ledger-status\""), true);
    await assert.rejects(
      access(join(tempDir, "artifacts", "business-spec.generated.ts")),
      /ENOENT/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI viewer supports version 3 canonicals through the packaged viewer path", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-vnext-viewer-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await writeFile(
      configPath,
      YAML.stringify({
        version: 1,
        spec: {
          entry: VNEXT_CROSS_CONTEXT_ENTRY_PATH
        },
        outputs: {
          rootDir: "./artifacts"
        },
        projections: {
          viewer: true,
          typescript: false
        }
      }),
      "utf8"
    );

    await runCliCommand(["viewer", "--config", configPath, "--", "--port", "0"], {
      cwd: tempDir,
      viewerCommandHooks: {
        launchViewer: async (options) => {
          launchOptions = options;
        }
      }
    });

    assert.ok(launchOptions);
    assert.equal(launchOptions.assetDirPath, CLI_DIST_VIEWER_DIR_PATH);
    assert.equal(
      launchOptions.viewerSpecPath,
      join(tempDir, "artifacts", "business-viewer", "viewer-spec.json")
    );
    assert.equal(launchOptions.port, 0);
    assert.equal(launchOptions.openBrowser, false);

    const viewer = JSON.parse(
      await readFile(
        join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"),
        "utf8"
      )
    ) as BusinessViewerSpec;

    assert.equal(viewer.views.some((view) => view.id === "message-flow"), true);
    assert.equal(JSON.stringify(viewer).includes("\"payment-authorized\""), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
