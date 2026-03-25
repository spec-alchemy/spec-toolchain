import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import test from "node:test";
import type { BusinessSpec, BusinessSpecAnalysis } from "../ddd-spec-core/index.js";
import type { BusinessViewerSpec } from "../ddd-spec-viewer-contract/index.js";
import {
  ZERO_CONFIG_FIXTURE
} from "./test-support/cli-test-fixtures.js";
import {
  assertExampleAnalysis,
  assertExampleBundle,
  assertExampleViewer,
  assertGeneratedInitSkeleton,
  assertGeneratedVsCodeWorkspaceConfig,
  copyExampleCanonicalToZeroConfigRoot,
  getInstalledCliEntryPath,
  installPublishedCliTarball,
  readOptionalTextFile,
  readViewerDevSessionStatus,
  runCommand,
  waitForChildExit,
  waitForCondition,
  waitForViewerServer,
  writeBrowserOpenStub,
  writeExampleConfig
} from "./test-support/cli-test-helpers.js";

test("npm pack smoke test installs the tarball and runs zero-config init plus build", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-zero-config-"));
  const consumerRootPath = join(tempDir, "consumer");

  try {
    await mkdir(consumerRootPath, { recursive: true });
    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(
      process.execPath,
      [installedCliEntryPath, "init"],
      { cwd: consumerRootPath }
    );

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

    await rm(join(consumerRootPath, "ddd-spec", "canonical"), {
      recursive: true,
      force: true
    });
    await copyExampleCanonicalToZeroConfigRoot(consumerRootPath, ZERO_CONFIG_FIXTURE.id);

    await runCommand(
      process.execPath,
      [installedCliEntryPath, "build"],
      {
        cwd: consumerRootPath
      }
    );

    const bundle = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as BusinessSpec;
    const analysis = JSON.parse(
      await readFile(
        join(consumerRootPath, ".ddd-spec", "artifacts", "business-spec.analysis.json"),
        "utf8"
      )
    ) as BusinessSpecAnalysis;
    const viewer = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assertExampleBundle(bundle, ZERO_CONFIG_FIXTURE);
    assertExampleAnalysis(analysis, ZERO_CONFIG_FIXTURE);
    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
    await access(join(consumerRootPath, ".ddd-spec", "generated", "business-spec.generated.ts"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("npm pack smoke test installs the tarball and runs explicit order-payment init plus build", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-template-"));
  const consumerRootPath = join(tempDir, "consumer");

  try {
    await mkdir(consumerRootPath, { recursive: true });
    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(
      process.execPath,
      [installedCliEntryPath, "init", "--template", "order-payment"],
      { cwd: consumerRootPath }
    );

    await assertGeneratedInitSkeleton(consumerRootPath, "order-payment");

    await runCommand(
      process.execPath,
      [installedCliEntryPath, "build"],
      {
        cwd: consumerRootPath
      }
    );

    const bundle = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "business-spec.json"), "utf8")
    ) as BusinessSpec;
    const viewer = JSON.parse(
      await readFile(join(consumerRootPath, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
    ) as BusinessViewerSpec;

    assert.equal(bundle.id, "order-payment");
    assert.deepEqual(
      bundle.domain.objects.map((object) => object.id),
      ["Order", "Payment"]
    );
    assert.equal(viewer.specId, "order-payment");
    assert.ok(viewer.views.length > 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("npm pack smoke test installs the tarball and runs build with --config", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-pack-smoke-config-"));
  const consumerRootPath = join(tempDir, "consumer");

  try {
    await mkdir(consumerRootPath, { recursive: true });

    const configPath = await writeExampleConfig({
      rootPath: consumerRootPath,
      example: ZERO_CONFIG_FIXTURE
    });
    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

    await runCommand(
      process.execPath,
      [installedCliEntryPath, "build", "--config", configPath],
      {
        cwd: consumerRootPath
      }
    );

    const bundle = JSON.parse(
      await readFile(join(consumerRootPath, "artifacts", "business-spec.json"), "utf8")
    ) as BusinessSpec;
    const analysis = JSON.parse(
      await readFile(
        join(consumerRootPath, "artifacts", "business-spec.analysis.json"),
        "utf8"
      )
    ) as BusinessSpecAnalysis;
    const viewer = JSON.parse(
      await readFile(
        join(consumerRootPath, "artifacts", "business-viewer", "viewer-spec.json"),
        "utf8"
      )
    ) as BusinessViewerSpec;

    assertExampleBundle(bundle, ZERO_CONFIG_FIXTURE);
    assertExampleAnalysis(analysis, ZERO_CONFIG_FIXTURE);
    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
    await access(join(consumerRootPath, "generated", `${ZERO_CONFIG_FIXTURE.id}.generated.ts`));
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
    await copyExampleCanonicalToZeroConfigRoot(consumerRootPath, ZERO_CONFIG_FIXTURE.id);

    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);

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

    assert.deepEqual(viewer, builtViewer);
    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
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
    await copyExampleCanonicalToZeroConfigRoot(consumerRootPath, ZERO_CONFIG_FIXTURE.id);
    await writeBrowserOpenStub(tempDir);

    const installedPackagePath = await installPublishedCliTarball(consumerRootPath);
    const installedCliEntryPath = getInstalledCliEntryPath(installedPackagePath);
    const processPath = join(
      consumerRootPath,
      "ddd-spec",
      "canonical",
      "processes",
      "order-payment.process.yaml"
    );
    const originalProcessSource = await readFile(processPath, "utf8");
    const recoveredProcessSource = originalProcessSource.replace(
      "title: 订单提交与支付确认闭环",
      "title: 订单提交与支付确认闭环（恢复后）"
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

    await writeFile(processPath, "id: [\n", "utf8");

    await waitForCondition(async () => {
      const failedDevSessionStatus = await readViewerDevSessionStatus(viewerUrl);

      return (
        failedDevSessionStatus.buildState === "failed" &&
        failedDevSessionStatus.lastSuccessfulBuildRevision === 1 &&
        Boolean(failedDevSessionStatus.lastFailureMessage)
      );
    });

    await writeFile(processPath, recoveredProcessSource, "utf8");

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
