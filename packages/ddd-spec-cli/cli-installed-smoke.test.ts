import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import type { BusinessViewerSpec } from "../ddd-spec-viewer-contract/index.js";
import { REPO_VIEWER_ENTRY_PATH } from "./test-support/cli-test-fixtures.js";
import {
  assertGeneratedInitSkeleton,
  assertGeneratedVsCodeWorkspaceConfig,
  getInstalledCliEntryPath,
  installPublishedCliTarball,
  readOptionalTextFile,
  readViewerDevSessionStatus,
  runCommand,
  waitForChildExit,
  waitForCondition,
  waitForViewerServer,
  writeBrowserOpenStub
} from "./test-support/cli-test-helpers.js";
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

test("npm pack smoke test installs the tarball and runs zero-config init plus build", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-zero-config-"));
  const consumerRootPath = join(tempDir, "consumer");

  try {
    await mkdir(consumerRootPath, { recursive: true });
    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(process.execPath, [installedCliEntryPath, "init"], {
      cwd: consumerRootPath
    });

    await assertGeneratedInitSkeleton(consumerRootPath);
    await assertGeneratedVsCodeWorkspaceConfig({
      rootPath: consumerRootPath
    });
    assert.doesNotMatch(
      await readFile(join(consumerRootPath, ".vscode", "settings.json"), "utf8"),
      /node_modules/
    );

    const gitignoreSource = await readFile(join(consumerRootPath, ".gitignore"), "utf8");

    assert.match(gitignoreSource, /^\.ddd-spec\/$/m);

    await runCommand(process.execPath, [installedCliEntryPath, "build"], {
      cwd: consumerRootPath
    });

    const bundle = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as {
      version: number;
      id: string;
    };
    const analysis = JSON.parse(
      await readFile(
        join(consumerRootPath, ".ddd-spec", "artifacts", "business-spec.analysis.json"),
        "utf8"
      )
    ) as {
      summary: {
        errorCount: number;
      };
    };
    const viewer = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.equal(bundle.version, 1);
    assert.equal(viewer.viewerVersion, 1);
    assert.equal(bundle.id, "approval-flow");
    assert.equal(analysis.summary.errorCount, 0);
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

test("npm pack smoke test installs the tarball and runs build with --config on a vNext example", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-config-"));
  const consumerRootPath = join(tempDir, "consumer");
  const configPath = join(consumerRootPath, "ddd-spec.config.yaml");

  try {
    await mkdir(consumerRootPath, { recursive: true });
    await writeFile(
      configPath,
      YAML.stringify({
        version: 1,
        spec: {
          entry: REPO_VIEWER_ENTRY_PATH
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

    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(process.execPath, [installedCliEntryPath, "build", "--config", configPath], {
      cwd: consumerRootPath
    });

    const bundle = JSON.parse(
      await readFile(join(consumerRootPath, "artifacts", "business-spec.json"), "utf8")
    ) as {
      version: number;
    };
    const viewer = JSON.parse(
      await readFile(join(consumerRootPath, "artifacts", "business-viewer", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.equal(bundle.version, 1);
    assert.equal(viewer.viewerVersion, 1);
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

test("npm pack smoke test installs the tarball and serves packaged viewer assets", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-viewer-"));
  const consumerRootPath = join(tempDir, "consumer");
  let child: ChildProcessWithoutNullStreams | undefined;

  try {
    await mkdir(consumerRootPath, { recursive: true });
    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(process.execPath, [installedCliEntryPath, "init"], {
      cwd: consumerRootPath
    });

    child = spawn(
      process.execPath,
      [installedCliEntryPath, "viewer", "--", "--port", "0"],
      {
        cwd: consumerRootPath,
        env: {
          ...process.env
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    const viewerUrl = await waitForViewerServer(child);
    const indexResponse = await fetch(viewerUrl);

    assert.equal(indexResponse.status, 200);

    const html = await indexResponse.text();
    const assetMatch = html.match(/\.\/(assets\/[^"]+\.js)/);

    assert.match(html, /\.\/assets\//);
    assert.ok(assetMatch);

    const assetResponse = await fetch(new URL(assetMatch[1], viewerUrl));

    assert.equal(assetResponse.status, 200);

    const viewerResponse = await fetch(new URL("/generated/viewer-spec.json", viewerUrl));

    assert.equal(viewerResponse.status, 200);

    const devSessionStatus = await readViewerDevSessionStatus(viewerUrl);

    assert.deepEqual(devSessionStatus, {
      enabled: false,
      buildState: "idle",
      lastFailureMessage: null,
      lastSuccessfulBuildRevision: 0
    });

    const viewer = await viewerResponse.json() as BusinessViewerSpec;
    const builtViewer = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.equal(viewer.viewerVersion, 1);
    assert.equal(builtViewer.viewerVersion, 1);
    assert.deepEqual(viewer, builtViewer);
    assertPrimaryViewOrder(viewer, [
      "context-map",
      "scenario-story",
      "message-flow",
      "lifecycle",
      "policy-saga"
    ]);
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await waitForChildExit(child);
    }

    await rm(tempDir, { recursive: true, force: true });
  }
});

test("npm pack smoke test installs the tarball and keeps the packaged dev watch loop alive across failures", async () => {
  if (process.platform === "win32") {
    return;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-dev-"));
  const consumerRootPath = join(tempDir, "consumer");
  const browserOpenLogPath = join(tempDir, "browser-open.log");
  let child: ChildProcessWithoutNullStreams | undefined;

  try {
    await mkdir(consumerRootPath, { recursive: true });
    await writeBrowserOpenStub(tempDir);

    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(process.execPath, [installedCliEntryPath, "init"], {
      cwd: consumerRootPath
    });

    const scenarioPath = join(
      consumerRootPath,
      "domain-model",
      "scenarios",
      "approval-request-flow.scenario.yaml"
    );
    const originalScenarioSource = await readFile(scenarioPath, "utf8");
    const recoveredScenarioSource = originalScenarioSource.replace(
      "title: Approval Request Flow",
      "title: Approval Request Flow (Recovered)"
    );

    child = spawn(
      process.execPath,
      [installedCliEntryPath, "dev", "--", "--port", "0"],
      {
        cwd: consumerRootPath,
        env: {
          ...process.env,
          DDD_SPEC_BROWSER_OPEN_LOG: browserOpenLogPath,
          PATH: `${join(tempDir, "bin")}${delimiter}${process.env.PATH ?? ""}`
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    const viewerUrl = await waitForViewerServer(child);
    const initialViewer = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    await waitForCondition(async () => {
      const browserOpenLog = await readOptionalTextFile(browserOpenLogPath);

      return browserOpenLog.includes(viewerUrl.toString());
    });

    const initialDevSessionStatus = await readViewerDevSessionStatus(viewerUrl);

    assert.equal(initialDevSessionStatus.enabled, true);
    assert.equal(initialDevSessionStatus.buildState, "ready");
    assert.equal(initialDevSessionStatus.lastSuccessfulBuildRevision, 1);
    assert.equal(initialDevSessionStatus.lastFailureMessage, null);

    await writeFile(scenarioPath, "id: [\n", "utf8");

    await waitForCondition(async () => {
      const failedDevSessionStatus = await readViewerDevSessionStatus(viewerUrl);

      return (
        failedDevSessionStatus.buildState === "failed" &&
        failedDevSessionStatus.lastSuccessfulBuildRevision === 1 &&
        Boolean(failedDevSessionStatus.lastFailureMessage)
      );
    });

    await writeFile(scenarioPath, recoveredScenarioSource, "utf8");

    await waitForCondition(async () => {
      const recoveredDevSessionStatus = await readViewerDevSessionStatus(viewerUrl);

      return (
        recoveredDevSessionStatus.buildState === "ready" &&
        recoveredDevSessionStatus.lastSuccessfulBuildRevision > 1 &&
        recoveredDevSessionStatus.lastFailureMessage === null
      );
    });

    const recoveredViewer = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.notDeepEqual(recoveredViewer, initialViewer);
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await waitForChildExit(child);
    }

    await rm(tempDir, { recursive: true, force: true });
  }
});
