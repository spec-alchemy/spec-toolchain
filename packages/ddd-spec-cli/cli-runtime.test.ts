import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import type { BusinessSpecAnalysis } from "../ddd-spec-core/index.js";
import type { BusinessViewerSpec } from "../ddd-spec-viewer-contract/index.js";
import { runCliCommand } from "./commands.js";
import {
  CLI_DIST_VIEWER_DIR_PATH,
  REPO_VIEWER_ENTRY_PATH,
  TEST_CROSS_CONTEXT_ENTRY_PATH
} from "./test-support/cli-test-fixtures.js";
import { copyDomainModelToZeroConfigRoot } from "./test-support/cli-test-helpers.js";
import type { LaunchViewerOptions } from "./viewer.js";
import YAML from "yaml";

function assertPrimaryViewOrder(
  viewer: Pick<BusinessViewerSpec, "views">,
  expectedViewIds: readonly string[]
): void {
  assert.deepEqual(
    viewer.views.map((view) => view.id),
    expectedViewIds
  );
}

function buildConfigSource(options: {
  entryPath?: string;
  rootDir?: string;
  viewerSyncTargets?: readonly string[];
  typescript?: boolean;
} = {}): string {
  return YAML.stringify({
    version: 1,
    spec: {
      entry: options.entryPath ?? TEST_CROSS_CONTEXT_ENTRY_PATH
    },
    outputs: {
      rootDir: options.rootDir ?? "./artifacts"
    },
    ...(options.viewerSyncTargets
      ? {
          viewer: {
            syncTargets: [...options.viewerSyncTargets]
          }
        }
      : {}),
    projections: {
      viewer: true,
      typescript: options.typescript ?? false
    }
  });
}

test("CLI build syncs viewer spec to configured sync targets", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-sync-targets-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(
      configPath,
      buildConfigSource({
        viewerSyncTargets: ["./app/public/generated/viewer-spec.json"]
      }),
      "utf8"
    );

    await runCliCommand(["build", "--config", configPath], {
      cwd: tempDir
    });

    const builtViewerSpec = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;
    const builtEnglishViewerSpec = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.en.json"), "utf8")
    ) as BusinessViewerSpec;
    const builtChineseViewerSpec = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.zh-CN.json"), "utf8")
    ) as BusinessViewerSpec;
    const syncedViewerSpec = JSON.parse(
      await readFile(join(tempDir, "app", "public", "generated", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;
    const syncedEnglishViewerSpec = JSON.parse(
      await readFile(join(tempDir, "app", "public", "generated", "viewer-spec.en.json"), "utf8")
    ) as BusinessViewerSpec;
    const syncedChineseViewerSpec = JSON.parse(
      await readFile(join(tempDir, "app", "public", "generated", "viewer-spec.zh-CN.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.deepEqual(builtViewerSpec, builtEnglishViewerSpec);
    assert.deepEqual(syncedViewerSpec, builtViewerSpec);
    assert.deepEqual(syncedEnglishViewerSpec, builtEnglishViewerSpec);
    assert.deepEqual(syncedChineseViewerSpec, builtChineseViewerSpec);
    assert.notEqual(
      builtChineseViewerSpec.detailHelp.semantic["context.id"],
      builtEnglishViewerSpec.detailHelp.semantic["context.id"]
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI generate commands write only the requested artifacts", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-generate-commands-"));

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

    await runCliCommand(["generate", "bundle"], { cwd: tempDir });
    await access(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"));
    await assert.rejects(
      access(join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json")),
      /ENOENT/
    );

    await runCliCommand(["generate", "analysis"], { cwd: tempDir });
    await access(join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json"));

    await runCliCommand(["generate", "viewer"], { cwd: tempDir });
    await access(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI validate succeeds in explicit config mode without writing outputs", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-validate-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(configPath, buildConfigSource(), "utf8");

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

test("CLI validate subcommands succeed without writing outputs in zero-config mode", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-validate-subcommands-"));

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

    await runCliCommand(["validate", "schema"], { cwd: tempDir });
    await runCliCommand(["validate", "semantics"], { cwd: tempDir });
    await runCliCommand(["validate", "analysis"], { cwd: tempDir });

    await assert.rejects(
      readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8"),
      /ENOENT/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI validate and build succeed in zero-config mode with the reset domain model version", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-build-"));

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

    await runCliCommand(["validate"], { cwd: tempDir });

    await assert.rejects(
      readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8"),
      /ENOENT/
    );

    await runCliCommand(["build"], { cwd: tempDir });

    const bundle = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as {
      version: number;
      id: string;
    };
    const analysis = JSON.parse(
      await readFile(
        join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json"),
        "utf8"
      )
    ) as BusinessSpecAnalysis;
    const viewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;
    const englishViewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.en.json"), "utf8")
    ) as BusinessViewerSpec;
    const chineseViewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.zh-CN.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.equal(bundle.version, 1);
    assert.equal(viewer.viewerVersion, 1);
    assert.equal(chineseViewer.viewerVersion, 1);
    assert.equal(bundle.id, "approval-flow");
    assert.equal(analysis.summary.errorCount, 0);
    assert.deepEqual(viewer, englishViewer);
    assert.equal(chineseViewer.title, viewer.title);
    assert.notEqual(chineseViewer.views[0]?.title, viewer.views[0]?.title);
    assertPrimaryViewOrder(viewer, [
      "context-map",
      "scenario-story",
      "message-flow",
      "lifecycle",
      "policy-saga"
    ]);
    await assert.rejects(
      access(join(tempDir, ".ddd-spec", "generated", "business-spec.generated.ts")),
      /ENOENT/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI serve launches the packaged static server from an existing zero-config viewer artifact", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-serve-"));
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);
    await runCliCommand(["build"], { cwd: tempDir });

    await runCliCommand(["serve", "--", "--host", "0.0.0.0"], {
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

    assert.equal(viewer.viewerVersion, 1);
    assertPrimaryViewOrder(viewer, [
      "context-map",
      "scenario-story",
      "message-flow",
      "lifecycle",
      "policy-saga"
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI serve launches the packaged static server from an existing explicit-config viewer artifact", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-serve-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await writeFile(configPath, buildConfigSource(), "utf8");
    await runCliCommand(["build", "--config", configPath], {
      cwd: tempDir
    });

    await runCliCommand(["serve", "--config", configPath, "--", "--host", "0.0.0.0", "--port", "0"], {
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
    const englishViewer = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.en.json"), "utf8")
    ) as BusinessViewerSpec;
    const chineseViewer = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-viewer", "viewer-spec.zh-CN.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.equal(viewer.viewerVersion, 1);
    assert.equal(chineseViewer.viewerVersion, 1);
    assert.deepEqual(viewer, englishViewer);
    assert.equal(chineseViewer.title, viewer.title);
    assertPrimaryViewOrder(viewer, [
      "context-map",
      "scenario-story",
      "message-flow",
      "lifecycle"
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI dev rebuilds the zero-config viewer artifact and enables browser auto-open by default", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-dev-"));
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

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

    assert.equal(viewer.viewerVersion, 1);
    assertPrimaryViewOrder(viewer, [
      "context-map",
      "scenario-story",
      "message-flow",
      "lifecycle",
      "policy-saga"
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI serve rejects missing viewer output with a build hint", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-serve-missing-viewer-"));

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

    await assert.rejects(
      runCliCommand(["serve"], { cwd: tempDir }),
      /Run `ddd-spec build` or `ddd-spec generate viewer` before `ddd-spec serve`\./
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI clean removes generated artifacts", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-clean-"));

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);
    await runCliCommand(["build"], { cwd: tempDir });
    await runCliCommand(["clean"], { cwd: tempDir });

    await assert.rejects(
      access(join(tempDir, ".ddd-spec", "artifacts", "business-spec.json")),
      /ENOENT/
    );
    await assert.rejects(
      access(join(tempDir, ".ddd-spec", "artifacts", "business-spec.analysis.json")),
      /ENOENT/
    );
    await assert.rejects(
      access(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json")),
      /ENOENT/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI config print writes the resolved config JSON", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-config-print-"));
  const originalLog = console.log;
  const logMessages: string[] = [];

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

    console.log = ((...args: unknown[]) => {
      logMessages.push(args.map(String).join(" "));
    }) as typeof console.log;

    await runCliCommand(["config", "print"], { cwd: tempDir });
  } finally {
    console.log = originalLog;
    await rm(tempDir, { recursive: true, force: true });
  }

  const printedConfig = JSON.parse(logMessages.join("\n")) as {
    mode: string;
    spec: {
      entryPath: string;
    };
  };

  assert.equal(printedConfig.mode, "zero-config");
  assert.equal(printedConfig.spec.entryPath, join(tempDir, "domain-model", "index.yaml"));
});

test("CLI doctor reports blocking issues for missing viewer output", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-doctor-"));
  const originalLog = console.log;
  const logMessages: string[] = [];

  try {
    await copyDomainModelToZeroConfigRoot(tempDir);

    console.log = ((...args: unknown[]) => {
      logMessages.push(args.map(String).join(" "));
    }) as typeof console.log;

    await assert.rejects(runCliCommand(["doctor"], { cwd: tempDir }), /doctor found 1 blocking issue/);
  } finally {
    console.log = originalLog;
    await rm(tempDir, { recursive: true, force: true });
  }

  assert.match(logMessages.join("\n"), /viewer artifact missing/);
});

test("CLI build supports version 1 domain models when viewer projection is enabled without TypeScript output", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-domain-model-build-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(
      configPath,
      buildConfigSource({
        entryPath: TEST_CROSS_CONTEXT_ENTRY_PATH
      }),
      "utf8"
    );

    await runCliCommand(["build", "--config", configPath], {
      cwd: tempDir
    });

    const bundle = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-spec.json"), "utf8")
    ) as { version: 1 };
    const analysis = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-spec.analysis.json"), "utf8")
    ) as BusinessSpecAnalysis;
    const viewer = JSON.parse(
      await readFile(
        join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"),
        "utf8"
      )
    ) as BusinessViewerSpec;

    assert.equal(bundle.version, 1);
    assert.equal(viewer.viewerVersion, 1);
    assert.equal(analysis.summary.errorCount, 0);
    assertPrimaryViewOrder(viewer, [
      "context-map",
      "scenario-story",
      "message-flow",
      "lifecycle"
    ]);
    assert.equal(JSON.stringify(viewer).includes("\"fetch-ledger-status\""), true);
    await assert.rejects(
      access(join(tempDir, "artifacts", "business-spec.generated.ts")),
      /ENOENT/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI serve supports version 1 domain models through the packaged viewer path", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-domain-model-serve-"));
  const configPath = join(tempDir, "ddd-spec.config.yaml");
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await writeFile(
      configPath,
      buildConfigSource({
        entryPath: REPO_VIEWER_ENTRY_PATH
      }),
      "utf8"
    );
    await runCliCommand(["build", "--config", configPath], {
      cwd: tempDir
    });

    await runCliCommand(["serve", "--config", configPath, "--", "--port", "0"], {
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

    assert.equal(viewer.viewerVersion, 1);
    assert.equal(viewer.views.some((view) => view.id === "message-flow"), true);
    assert.equal(JSON.stringify(viewer).includes("\"payment-authorized\""), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
