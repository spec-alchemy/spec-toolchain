import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { loadDddSpecConfig } from "./config.js";
import { runCliCommand } from "./commands.js";

const ORDER_PAYMENT_CONFIG_PATH = fileURLToPath(
  new URL("../../examples/order-payment/ddd-spec.config.yaml", import.meta.url)
);

const ORDER_PAYMENT_ENTRY_PATH = fileURLToPath(
  new URL("../../examples/order-payment/canonical/index.yaml", import.meta.url)
);

test("order-payment example config resolves repo-local relative paths", async () => {
  const config = await loadDddSpecConfig({
    configPath: ORDER_PAYMENT_CONFIG_PATH
  });

  assert.equal(config.spec.entryPath, ORDER_PAYMENT_ENTRY_PATH);
  assert.equal(config.projections.viewer, true);
  assert.equal(config.projections.typescript, true);
  assert.match(config.outputs.rootDirPath ?? "", /examples\/order-payment\/artifacts$/);
});

test("CLI build succeeds for the order-payment example with isolated outputs", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-order-payment-"));
  const tempConfigPath = join(tempDir, "ddd-spec.config.yaml");

  try {
    await writeFile(
      tempConfigPath,
      YAML.stringify({
        version: 1,
        spec: {
          entry: ORDER_PAYMENT_ENTRY_PATH
        },
        outputs: {
          rootDir: join(tempDir, "artifacts"),
          typescript: join(tempDir, "generated", "order-payment.generated.ts")
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
    ) as { id: string };
    const analysis = JSON.parse(
      await readFile(join(tempDir, "artifacts", "business-spec.analysis.json"), "utf8")
    ) as { analysisVersion: number; specId: string; summary: { errorCount: number } };
    const viewer = JSON.parse(
      await readFile(
        join(tempDir, "artifacts", "business-viewer", "viewer-spec.json"),
        "utf8"
      )
    ) as { viewerVersion: number; specId: string; views: readonly unknown[] };
    const typescriptSource = await readFile(
      join(tempDir, "generated", "order-payment.generated.ts"),
      "utf8"
    );

    assert.equal(bundle.id, "order-payment");
    assert.equal(analysis.analysisVersion, 1);
    assert.equal(analysis.specId, "order-payment");
    assert.equal(analysis.summary.errorCount, 0);
    assert.equal(viewer.viewerVersion, 1);
    assert.equal(viewer.specId, "order-payment");
    assert.ok(viewer.views.length > 0);
    assert.match(typescriptSource, /export const businessSpec =/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
