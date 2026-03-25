import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type {
  BusinessSpec,
  BusinessSpecAnalysis,
  ObjectSpec,
  ProcessSpec
} from "../ddd-spec-core/index.js";
import {
  loadBusinessSpec,
  validateBusinessSpecSchema
} from "../ddd-spec-core/index.js";
import type {
  BusinessViewerSpec,
  ViewerDetailItem,
  ViewerEdgeSpec,
  ViewerNodeSpec,
  ViewerViewSpec
} from "../ddd-spec-viewer-contract/index.js";
import YAML from "yaml";
import { buildUsageText } from "./console.js";
import { loadDddSpecConfig } from "./config.js";
import { runCliCommand } from "./commands.js";
import type { LaunchViewerOptions } from "./viewer.js";

interface ExampleFieldRequirement {
  objectId: string;
  fieldId: string;
  required: boolean;
}

interface ExampleAdvance {
  sourceStage: string;
  eventType: string;
  targetStage: string;
}

interface ExamplePaths {
  rootDirPath: string;
  bundlePath: string;
  analysisPath: string;
  viewerPath: string;
  typescriptPath: string;
}

interface ExampleFixture {
  id: string;
  configPath: string;
  entryPath: string;
  expectedPaths: ExamplePaths;
  processId: string;
  aggregateIds: readonly string[];
  stageIds: readonly string[];
  finalStageIds: readonly string[];
  processAdvances: readonly ExampleAdvance[];
  fieldRequirements: readonly ExampleFieldRequirement[];
}

function toAbsolutePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

const EXAMPLE_FIXTURES: readonly ExampleFixture[] = [
  {
    id: "order-payment",
    configPath: toAbsolutePath("../../examples/order-payment/ddd-spec.config.yaml"),
    entryPath: toAbsolutePath("../../examples/order-payment/canonical/index.yaml"),
    expectedPaths: {
      rootDirPath: toAbsolutePath("../../examples/order-payment/artifacts"),
      bundlePath: toAbsolutePath("../../examples/order-payment/artifacts/business-spec.json"),
      analysisPath: toAbsolutePath(
        "../../examples/order-payment/artifacts/business-spec.analysis.json"
      ),
      viewerPath: toAbsolutePath(
        "../../examples/order-payment/artifacts/business-viewer/viewer-spec.json"
      ),
      typescriptPath: toAbsolutePath("../../examples/order-payment/generated/order-payment.generated.ts")
    },
    processId: "orderPaymentProcess",
    aggregateIds: ["Order", "Payment"],
    stageIds: [
      "awaitingOrderSubmission",
      "awaitingPaymentConfirmation",
      "closedOrderPaid"
    ],
    finalStageIds: ["closedOrderPaid"],
    processAdvances: [
      {
        sourceStage: "awaitingOrderSubmission",
        eventType: "OrderSubmitted",
        targetStage: "awaitingPaymentConfirmation"
      },
      {
        sourceStage: "awaitingPaymentConfirmation",
        eventType: "PaymentConfirmed",
        targetStage: "closedOrderPaid"
      }
    ],
    fieldRequirements: []
  },
  {
    id: "content-moderation",
    configPath: toAbsolutePath("../../examples/content-moderation/ddd-spec.config.yaml"),
    entryPath: toAbsolutePath("../../examples/content-moderation/canonical/index.yaml"),
    expectedPaths: {
      rootDirPath: toAbsolutePath("../../examples/content-moderation/artifacts"),
      bundlePath: toAbsolutePath("../../examples/content-moderation/artifacts/business-spec.json"),
      analysisPath: toAbsolutePath(
        "../../examples/content-moderation/artifacts/business-spec.analysis.json"
      ),
      viewerPath: toAbsolutePath(
        "../../examples/content-moderation/artifacts/business-viewer/viewer-spec.json"
      ),
      typescriptPath: toAbsolutePath(
        "../../examples/content-moderation/generated/content-moderation.generated.ts"
      )
    },
    processId: "contentModerationProcess",
    aggregateIds: ["ModerationCase", "Publication"],
    stageIds: [
      "awaitingReviewAssignment",
      "awaitingModerationDecision",
      "awaitingPublication",
      "closedRejected",
      "closedPublished"
    ],
    finalStageIds: ["closedRejected", "closedPublished"],
    processAdvances: [
      {
        sourceStage: "awaitingReviewAssignment",
        eventType: "ModerationReviewStarted",
        targetStage: "awaitingModerationDecision"
      },
      {
        sourceStage: "awaitingModerationDecision",
        eventType: "ContentApproved",
        targetStage: "awaitingPublication"
      },
      {
        sourceStage: "awaitingModerationDecision",
        eventType: "ContentRejected",
        targetStage: "closedRejected"
      },
      {
        sourceStage: "awaitingPublication",
        eventType: "ContentPublished",
        targetStage: "closedPublished"
      }
    ],
    fieldRequirements: [
      {
        objectId: "ModerationCase",
        fieldId: "reviewerId",
        required: false
      },
      {
        objectId: "Publication",
        fieldId: "channel",
        required: false
      }
    ]
  }
] as const;

const ZERO_CONFIG_FIXTURE = EXAMPLE_FIXTURES[0];
const DEFAULT_SCHEMA_PATH = toAbsolutePath("../ddd-spec-core/schema/business-spec.schema.json");
const CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH = toAbsolutePath(
  "../../test/fixtures/connection-card-review/canonical/index.yaml"
);
const CLI_PACKAGE_JSON_PATH = toAbsolutePath("./package.json");
const CLI_PACKAGE_README_PATH = toAbsolutePath("./README.md");
const CLI_DIST_ENTRY_PATH = toAbsolutePath("./dist/ddd-spec-cli/cli.js");
const CLI_DIST_INDEX_PATH = toAbsolutePath("./dist/ddd-spec-cli/index.js");
const CLI_DIST_SCHEMA_PATH = toAbsolutePath("./dist/ddd-spec-core/schema/business-spec.schema.json");
const CLI_DIST_VIEWER_DIR_PATH = toAbsolutePath("./dist/ddd-spec-cli/static/viewer");
const CLI_DIST_VIEWER_INDEX_PATH = toAbsolutePath(
  "./dist/ddd-spec-cli/static/viewer/index.html"
);
const CLI_DIST_VIEWER_GENERATED_SPEC_PATH = toAbsolutePath(
  "./dist/ddd-spec-cli/static/viewer/generated/viewer-spec.json"
);
const CHANGESET_CONFIG_PATH = toAbsolutePath("../../.changeset/config.json");
const CHANGESET_README_PATH = toAbsolutePath("../../.changeset/README.md");
const RELEASE_DRY_RUN_WORKFLOW_PATH = toAbsolutePath(
  "../../.github/workflows/release-dry-run.yml"
);
const RELEASE_GUIDE_PATH = toAbsolutePath("../../RELEASING.md");
const REPO_ROOT_README_PATH = toAbsolutePath("../../README.md");
const REPO_ROOT_PATH = toAbsolutePath("../../");
const REPO_ROOT_NODE_MODULES_PATH = toAbsolutePath("../../node_modules");
const REPO_VIEWER_CONFIG_PATH = toAbsolutePath(
  "../../apps/ddd-spec-viewer/ddd-spec.config.yaml"
);

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

test("zero-config validate shows an init hint when the canonical entry is missing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-missing-"));

  try {
    await assert.rejects(
      runCliCommand(["validate"], { cwd: tempDir }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("Run `ddd-spec init`") &&
        error.message.includes(join(tempDir, "ddd-spec", "canonical", "index.yaml"))
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CLI help documents zero-config defaults and advanced --config support", () => {
  const usageText = buildUsageText();

  assert.match(usageText, /Default workflow:/);
  assert.match(usageText, /Advanced config:/);
  assert.match(usageText, /Use --config <path> to load a version: 1 DDD spec config file/);
  assert.match(usageText, /\n  init\n/);
  assert.match(usageText, /\n  validate \[--config <path>\]\n/);
  assert.match(usageText, /\n  build \[--config <path>\]\n/);
  assert.match(usageText, /\n  viewer \[--config <path>\] \[-- <viewer-args\.\.\.>\]\n/);
  assert.match(usageText, /\n  generate-viewer \[--config <path>\]\n/);
  assert.match(usageText, /generate-typescript \[--config <path>\]$/);
  assert.doesNotMatch(usageText, /\n  generate viewer\n/);
  assert.doesNotMatch(usageText, /\n  generate typescript\n/);
  assert.match(usageText, /\n  ddd-spec init\n/);
  assert.match(usageText, /edit ddd-spec\/canonical\//);
  assert.match(usageText, /ddd-spec\/canonical\/index\.yaml/);
  assert.match(usageText, /\.ddd-spec\//);
});

test("repo viewer config resolves fixture-backed outputs and sync targets", async () => {
  const config = await loadDddSpecConfig({
    configPath: REPO_VIEWER_CONFIG_PATH
  });

  assert.equal(config.mode, "config");
  assert.equal(config.sourceDescription, REPO_VIEWER_CONFIG_PATH);
  assert.equal(config.spec.entryPath, CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH);
  assert.equal(
    config.outputs.rootDirPath,
    toAbsolutePath("../../.ddd-spec/artifacts")
  );
  assert.equal(
    config.outputs.bundlePath,
    toAbsolutePath("../../.ddd-spec/artifacts/business-spec.json")
  );
  assert.equal(
    config.outputs.analysisPath,
    toAbsolutePath("../../.ddd-spec/artifacts/business-spec.analysis.json")
  );
  assert.equal(
    config.outputs.viewerPath,
    toAbsolutePath("../../.ddd-spec/artifacts/viewer-spec.json")
  );
  assert.equal(
    config.outputs.typescriptPath,
    toAbsolutePath("../../.ddd-spec/generated/business-spec.generated.ts")
  );
  assert.deepEqual(config.viewer.syncTargetPaths, [
    toAbsolutePath("../../apps/ddd-spec-viewer/public/generated/viewer-spec.json")
  ]);
});

test("root package scripts target the repo viewer config", async () => {
  const packageSource = await readFile(toAbsolutePath("../../package.json"), "utf8");
  const packageJson = JSON.parse(packageSource) as {
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts.changeset, "changeset");
  assert.equal(packageJson.scripts["changeset:status"], "changeset status --verbose");
  assert.equal(packageJson.scripts["changeset:version"], "changeset version");
  assert.equal(
    packageJson.scripts["ddd-spec:validate"],
    "npm run build --workspace=packages/ddd-spec-cli && npm run repo:cli --workspace=packages/ddd-spec-cli -- validate --config apps/ddd-spec-viewer/ddd-spec.config.yaml"
  );
  assert.equal(
    packageJson.scripts["ddd-spec:build"],
    "npm run build --workspace=packages/ddd-spec-cli && npm run repo:cli --workspace=packages/ddd-spec-cli -- build --config apps/ddd-spec-viewer/ddd-spec.config.yaml"
  );
  assert.equal(
    packageJson.scripts["ddd-spec:viewer"],
    "npm run build --workspace=packages/ddd-spec-cli && npm run repo:cli --workspace=packages/ddd-spec-cli -- viewer --config apps/ddd-spec-viewer/ddd-spec.config.yaml --"
  );
  assert.equal(
    packageJson.scripts["ddd-spec:test"],
    "npm run test --workspace=packages/ddd-spec-cli"
  );
  assert.equal(
    packageJson.scripts["ddd-spec:release:dry-run"],
    "npm run ddd-spec:verify && npm run changeset:status && npm run changeset:version && npm publish --dry-run --workspace=packages/ddd-spec-cli"
  );
  assert.equal(packageJson.scripts["ddd-spec:init"], undefined);
  assert.equal(
    packageJson.scripts["dev:ddd-spec-viewer"],
    "npm run dev --workspace=apps/ddd-spec-viewer"
  );
  assert.equal(packageJson.devDependencies["@changesets/cli"], "^2.30.0");
});

test("changesets config versions only the public CLI package boundary", async () => {
  const configSource = await readFile(CHANGESET_CONFIG_PATH, "utf8");
  const config = JSON.parse(configSource) as {
    access: string;
    baseBranch: string;
    updateInternalDependencies: string;
    privatePackages: {
      version: boolean;
      tag: boolean;
    };
  };
  const readmeSource = await readFile(CHANGESET_README_PATH, "utf8");

  assert.equal(config.access, "public");
  assert.equal(config.baseBranch, "main");
  assert.equal(config.updateInternalDependencies, "patch");
  assert.deepEqual(config.privatePackages, {
    version: false,
    tag: false
  });
  assert.match(readmeSource, /@knowledge-alchemy\/ddd-spec/);
  assert.match(readmeSource, /npm run changeset/);
  assert.match(readmeSource, /npm run ddd-spec:release:dry-run/);
});

test("release dry-run workflow runs the reusable maintainer release preview", async () => {
  const workflowSource = await readFile(RELEASE_DRY_RUN_WORKFLOW_PATH, "utf8");

  assert.match(workflowSource, /^name: Release Dry Run/m);
  assert.match(workflowSource, /^on:\n  workflow_dispatch:\n  workflow_call:/m);
  assert.match(workflowSource, /fetch-depth: 0/);
  assert.match(workflowSource, /node-version: 24/);
  assert.match(workflowSource, /npm ci/);
  assert.match(workflowSource, /npm run ddd-spec:release:dry-run/);
});

test("maintainer docs explain the release dry-run and publish handoff", async () => {
  const rootReadmeSource = await readFile(REPO_ROOT_README_PATH, "utf8");
  const releaseGuideSource = await readFile(RELEASE_GUIDE_PATH, "utf8");

  assert.match(rootReadmeSource, /npm run changeset/);
  assert.match(rootReadmeSource, /npm run changeset:status/);
  assert.match(rootReadmeSource, /npm run ddd-spec:release:dry-run/);
  assert.match(rootReadmeSource, /npm publish --dry-run --workspace=packages\/ddd-spec-cli/);
  assert.match(rootReadmeSource, /commit the version and changelog files produced by `changeset version`/);
  assert.match(releaseGuideSource, /Version management lives under \[`\.changeset\/`\]/);
  assert.match(releaseGuideSource, /private workspace packages unversioned/);
  assert.match(releaseGuideSource, /workflow_dispatch/);
  assert.match(releaseGuideSource, /npm publish --workspace=packages\/ddd-spec-cli/);
});

test("CLI package metadata publishes a dist-backed installable command surface", async () => {
  const packageSource = await readFile(CLI_PACKAGE_JSON_PATH, "utf8");
  const packageJson = JSON.parse(packageSource) as {
    name: string;
    version: string;
    type: string;
    bin: Record<string, string>;
    exports: {
      ".": {
        types: string;
        default: string;
      };
      "./package.json": string;
    };
    files: string[];
    engines: {
      node: string;
    };
    publishConfig: {
      access: string;
    };
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };

  assert.equal(packageJson.name, "@knowledge-alchemy/ddd-spec");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.deepEqual(packageJson.bin, {
    "ddd-spec": "./dist/ddd-spec-cli/cli.js"
  });
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/ddd-spec-cli/index.d.ts",
      default: "./dist/ddd-spec-cli/index.js"
    },
    "./package.json": "./package.json"
  });
  assert.deepEqual(packageJson.files, ["dist"]);
  assert.deepEqual(packageJson.engines, {
    node: ">=18"
  });
  assert.deepEqual(packageJson.publishConfig, {
    access: "public"
  });
  assert.equal(packageJson.scripts.build, "node ./scripts/build.mjs");
  assert.equal(packageJson.scripts.cli, "node ./dist/ddd-spec-cli/cli.js");
  assert.equal(packageJson.scripts["repo:cli"], "node ./scripts/run-from-repo-root.mjs");
  assert.equal(packageJson.dependencies.ajv, "^8.18.0");
  assert.equal(packageJson.dependencies.yaml, "^2.8.3");
});

test("product README documents zero-config defaults and advanced --config usage", async () => {
  const readmeSource = await readFile(CLI_PACKAGE_README_PATH, "utf8");

  assert.match(readmeSource, /Zero-config is the default product path/);
  assert.match(readmeSource, /Use `--config <path>` only when a workspace needs custom entry paths/);
  assert.match(readmeSource, /`init` creates a starter `ddd-spec\/canonical\/` tree/);
  assert.match(readmeSource, /npx @knowledge-alchemy\/ddd-spec init/);
  assert.match(readmeSource, /npx @knowledge-alchemy\/ddd-spec build/);
  assert.match(readmeSource, /npx @knowledge-alchemy\/ddd-spec viewer -- --port 4173/);
  assert.match(
    readmeSource,
    /npx @knowledge-alchemy\/ddd-spec validate --config \.\/ddd-spec\.config\.yaml/
  );
  assert.match(
    readmeSource,
    /npx @knowledge-alchemy\/ddd-spec viewer --config \.\/ddd-spec\.config\.yaml -- --host 0\.0\.0\.0/
  );
  assert.match(readmeSource, /npm install -g @knowledge-alchemy\/ddd-spec/);
  assert.match(readmeSource, /ddd-spec validate/);
  assert.match(readmeSource, /ddd-spec viewer -- --host 0\.0\.0\.0/);
  assert.match(readmeSource, /npm exec ddd-spec build/);
  assert.match(readmeSource, /npm exec ddd-spec build --config \.\/ddd-spec\.config\.yaml/);
  assert.match(readmeSource, /npm exec ddd-spec viewer -- --port 4173/);
  assert.match(readmeSource, /npx --no-install ddd-spec validate/);
  assert.match(
    readmeSource,
    /The `viewer` command launches a local static server backed by packaged assets/
  );
  assert.match(
    readmeSource,
    /It serves the current workspace viewer output at `\/generated\/viewer-spec\.json`/
  );
});

test("CLI package build emits executable dist output and runtime schema assets", async () => {
  await access(CLI_DIST_ENTRY_PATH);
  await access(CLI_DIST_INDEX_PATH);
  await access(CLI_DIST_SCHEMA_PATH);

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

    await access(join(tempDir, "ddd-spec", "canonical", "index.yaml"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("npm pack dry-run keeps the published CLI package on dist output only", async () => {
  const npmCacheDir = await mkdtemp(join(tmpdir(), "ddd-spec-npm-cache-"));

  try {
    const result = await runCommand(
      getNpmCommand(),
      ["pack", "--dry-run", "--json", "--ignore-scripts", "--workspace=packages/ddd-spec-cli"],
      {
        cwd: REPO_ROOT_PATH,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir
        }
      }
    );
    const [packSummary] = JSON.parse(result.stdout.trim()) as [
      {
        files: Array<{
          path: string;
        }>;
      }
    ];
    const packedPaths = packSummary.files.map((file) => file.path);

    assert.ok(packedPaths.includes("dist/ddd-spec-cli/cli.js"));
    assert.ok(packedPaths.includes("dist/ddd-spec-cli/index.js"));
    assert.ok(packedPaths.includes("dist/ddd-spec-core/schema/business-spec.schema.json"));
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
    assert.ok(packedPaths.includes("README.md"));
    assert.ok(packedPaths.includes("package.json"));
    assert.ok(!packedPaths.includes("cli.ts"));
    assert.ok(!packedPaths.includes("commands.ts"));
    assert.ok(!packedPaths.includes("config.ts"));
    assert.ok(!packedPaths.includes("example-regression.test.ts"));
  } finally {
    await rm(npmCacheDir, { recursive: true, force: true });
  }
});

test("published package build runs from an isolated installed package directory", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-install-mode-"));
  const consumerRootPath = join(tempDir, "consumer");

  try {
    await mkdir(consumerRootPath, { recursive: true });
    await copyExampleCanonicalToZeroConfigRoot(consumerRootPath, ZERO_CONFIG_FIXTURE.id);

    const installedPackagePath = await installPublishedCliPackage(consumerRootPath);

    await runCommand(
      process.execPath,
      [join(installedPackagePath, "dist", "ddd-spec-cli", "cli.js"), "build"],
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
    const typescriptSource = await readFile(
      join(consumerRootPath, ".ddd-spec", "generated", "business-spec.generated.ts"),
      "utf8"
    );

    assertExampleBundle(bundle, ZERO_CONFIG_FIXTURE);
    assertExampleAnalysis(analysis, ZERO_CONFIG_FIXTURE);
    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
    assert.ok(typescriptSource.includes(`"id": "${ZERO_CONFIG_FIXTURE.id}"`));
    assert.ok(typescriptSource.includes(`"${ZERO_CONFIG_FIXTURE.processId}"`));
    assert.match(typescriptSource, /export const businessSpec =/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("published package viewer serves packaged assets and the current workspace viewer spec", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-install-viewer-"));
  const consumerRootPath = join(tempDir, "consumer");
  let child: ReturnType<typeof spawn> | undefined;

  try {
    await mkdir(consumerRootPath, { recursive: true });
    await copyExampleCanonicalToZeroConfigRoot(consumerRootPath, ZERO_CONFIG_FIXTURE.id);

    const installedPackagePath = await installPublishedCliPackage(consumerRootPath);

    child = spawn(
      process.execPath,
      [join(installedPackagePath, "dist", "ddd-spec-cli", "cli.js"), "viewer", "--", "--port", "0"],
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

test("CLI init creates a minimal zero-config skeleton that validate accepts", async () => {
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

    assert.match(gitignoreSource, /^\.ddd-spec\/$/m);
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

test("CLI init refuses to overwrite an existing canonical index", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-init-existing-"));
  const entryPath = join(tempDir, "ddd-spec", "canonical", "index.yaml");
  const existingSource = "version: 1\n";

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
      const typescriptSource = await readFile(
        join(tempDir, "generated", `${example.id}.generated.ts`),
        "utf8"
      );

      assertExampleBundle(bundle, example);
      assertExampleAnalysis(analysis, example);
      assertExampleViewer(viewer, example);
      assert.ok(typescriptSource.includes(`"id": "${example.id}"`));
      assert.ok(typescriptSource.includes(`"${example.processId}"`));
      assert.match(typescriptSource, /export const businessSpec =/);
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
    const typescriptSource = await readFile(
      join(tempDir, ".ddd-spec", "generated", "business-spec.generated.ts"),
      "utf8"
    );

    assertExampleBundle(bundle, ZERO_CONFIG_FIXTURE);
    assertExampleAnalysis(analysis, ZERO_CONFIG_FIXTURE);
    assertExampleViewer(viewer, ZERO_CONFIG_FIXTURE);
    assert.ok(typescriptSource.includes(`"id": "${ZERO_CONFIG_FIXTURE.id}"`));
    assert.ok(typescriptSource.includes(`"${ZERO_CONFIG_FIXTURE.processId}"`));
    assert.match(typescriptSource, /export const businessSpec =/);
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

function assertExampleBundle(bundle: BusinessSpec, example: ExampleFixture): void {
  assert.equal(bundle.id, example.id);
  assert.deepEqual(
    sortStrings(bundle.domain.aggregates.map((aggregate) => aggregate.objectId)),
    sortStrings(example.aggregateIds)
  );

  const process = mustFind(bundle.domain.processes, (candidate) => candidate.id === example.processId);

  assert.deepEqual(sortStrings(Object.keys(process.stages)), sortStrings(example.stageIds));
  assert.deepEqual(
    sortStrings(collectFinalStageIds(process)),
    sortStrings(example.finalStageIds)
  );
  assert.deepEqual(
    sortStrings(collectProcessAdvances(process).map(formatAdvance)),
    sortStrings(example.processAdvances.map(formatAdvance))
  );

  for (const requirement of example.fieldRequirements) {
    const object = mustFind(
      bundle.domain.objects,
      (candidate) => candidate.id === requirement.objectId
    );
    const field = mustFind(object.fields, (candidate) => candidate.id === requirement.fieldId);

    assert.equal(field.required, requirement.required);
  }
}

function assertExampleAnalysis(
  analysis: BusinessSpecAnalysis,
  example: ExampleFixture
): void {
  assert.equal(analysis.analysisVersion, 1);
  assert.equal(analysis.specId, example.id);
  assert.equal(analysis.summary.errorCount, 0);
  assert.equal(analysis.summary.warningCount, 0);
  assert.deepEqual(analysis.diagnostics, []);
  assert.deepEqual(
    sortStrings(analysis.graph.aggregates.map((aggregate) => aggregate.objectId)),
    sortStrings(example.aggregateIds)
  );

  const process = mustFind(
    analysis.graph.processes,
    (candidate) => candidate.processId === example.processId
  );

  assert.deepEqual(sortStrings(process.stages.map((stage) => stage.stageId)), sortStrings(example.stageIds));
  assert.deepEqual(sortStrings(process.finalStageIds), sortStrings(example.finalStageIds));
  assert.deepEqual(
    sortStrings(process.advances.map(formatAdvance)),
    sortStrings(example.processAdvances.map(formatAdvance))
  );
  assert.deepEqual(sortStrings(process.reachableStageIds), sortStrings(example.stageIds));

  for (const aggregate of analysis.graph.aggregates) {
    assert.deepEqual(aggregate.unreachableStateIds, []);
  }
}

function assertExampleViewer(viewer: BusinessViewerSpec, example: ExampleFixture): void {
  assert.equal(viewer.viewerVersion, 1);
  assert.equal(viewer.specId, example.id);
  assert.deepEqual(
    viewer.views.map((view) => view.id),
    ["composition", "lifecycle", "trace"]
  );

  const compositionView = mustFind(viewer.views, (view) => view.id === "composition");
  const lifecycleView = mustFind(viewer.views, (view) => view.id === "lifecycle");
  const traceView = mustFind(viewer.views, (view) => view.id === "trace");

  assert.deepEqual(
    sortStrings(
      compositionView.nodes
        .filter((node) => node.kind === "aggregate-group")
        .map((node) => getDetailValue(node.details, "aggregate.id"))
    ),
    sortStrings(example.aggregateIds)
  );
  assert.deepEqual(
    sortStrings(
      lifecycleView.nodes
        .filter((node) => node.kind === "aggregate-group")
        .map((node) => getDetailValue(node.details, "aggregate.id"))
    ),
    sortStrings(example.aggregateIds)
  );
  assert.deepEqual(
    sortStrings(
      traceView.nodes
        .filter((node) => node.kind === "stage" || node.kind === "final-stage")
        .map((node) => getDetailValue(node.details, "stage.id"))
    ),
    sortStrings(example.stageIds)
  );
  assert.deepEqual(
    sortStrings(
      traceView.nodes
        .filter((node) => node.kind === "final-stage")
        .map((node) => getDetailValue(node.details, "stage.id"))
    ),
    sortStrings(example.finalStageIds)
  );
  assert.deepEqual(
    sortStrings(
      compositionView.edges
        .filter((edge) => edge.kind === "advance")
        .map((edge) => formatAdvanceFromDetails(edge, "relation.from", "event.type", "relation.to"))
    ),
    sortStrings(example.processAdvances.map(formatAdvance))
  );
  assert.deepEqual(
    sortStrings(
      traceView.edges
        .filter((edge) => edge.kind === "advance")
        .map((edge) => `${getDetailValue(edge.details, "event.type")}|${getDetailValue(edge.details, "event.target_stage")}`)
    ),
    sortStrings(
      example.processAdvances.map(
        (advance) => `${advance.eventType}|${advance.targetStage}`
      )
    )
  );
}

function collectFinalStageIds(process: ProcessSpec): string[] {
  return Object.entries(process.stages)
    .filter(([, stage]) => Boolean(stage.final))
    .map(([stageId]) => stageId);
}

function collectProcessAdvances(process: ProcessSpec): ExampleAdvance[] {
  return Object.entries(process.stages).flatMap(([stageId, stage]) =>
    Object.entries(stage.advancesOn ?? {}).map(([eventType, targetStage]) => ({
      sourceStage: stageId,
      eventType,
      targetStage
    }))
  );
}

function formatAdvance(advance: ExampleAdvance): string {
  return `${advance.sourceStage}|${advance.eventType}|${advance.targetStage}`;
}

function formatAdvanceFromDetails(
  edge: ViewerEdgeSpec,
  sourceKey: string,
  eventKey: string,
  targetKey: string
): string {
  return [
    getDetailValue(edge.details, sourceKey),
    getDetailValue(edge.details, eventKey),
    getDetailValue(edge.details, targetKey)
  ].join("|");
}

function getDetailValue(details: readonly ViewerDetailItem[], semanticKey: string): string {
  const detail = details.find((candidate) => candidate.semanticKey === semanticKey);

  if (!detail) {
    throw new Error(`Expected detail ${semanticKey}`);
  }

  return detail.value;
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort();
}

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error("Expected value to exist");
  }

  return value;
}

async function copyExampleCanonicalToZeroConfigRoot(
  targetRootPath: string,
  exampleId: ExampleFixture["id"]
): Promise<void> {
  await cp(
    toAbsolutePath(`../../examples/${exampleId}/canonical`),
    join(targetRootPath, "ddd-spec", "canonical"),
    { recursive: true }
  );
}

async function writeExampleConfig(options: {
  example: ExampleFixture;
  rootPath: string;
  viewerSyncTargets?: readonly string[];
}): Promise<string> {
  const configPath = join(options.rootPath, "ddd-spec.config.yaml");

  await writeFile(
    configPath,
    YAML.stringify({
      version: 1,
      spec: {
        entry: options.example.entryPath
      },
      outputs: {
        rootDir: "./artifacts",
        typescript: `./generated/${options.example.id}.generated.ts`
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
        typescript: true
      }
    }),
    "utf8"
  );

  return configPath;
}

async function installPublishedCliPackage(consumerRootPath: string): Promise<string> {
  const installedPackagePath = join(
    consumerRootPath,
    "node_modules",
    "@knowledge-alchemy",
    "ddd-spec"
  );
  const targetNodeModulesPath = join(consumerRootPath, "node_modules");
  const packageJson = JSON.parse(await readFile(CLI_PACKAGE_JSON_PATH, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const copiedPackages = new Set<string>();

  await mkdir(installedPackagePath, { recursive: true });
  await cp(toAbsolutePath("./dist"), join(installedPackagePath, "dist"), {
    recursive: true
  });
  await cp(CLI_PACKAGE_JSON_PATH, join(installedPackagePath, "package.json"));

  for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
    await copyInstalledDependency({
      copiedPackages,
      packageName: dependencyName,
      targetNodeModulesPath
    });
  }

  return installedPackagePath;
}

async function copyInstalledDependency(options: {
  copiedPackages: Set<string>;
  packageName: string;
  targetNodeModulesPath: string;
}): Promise<void> {
  if (options.copiedPackages.has(options.packageName)) {
    return;
  }

  options.copiedPackages.add(options.packageName);

  const sourcePackagePath = resolveNodeModulesPackagePath(
    REPO_ROOT_NODE_MODULES_PATH,
    options.packageName
  );
  const targetPackagePath = resolveNodeModulesPackagePath(
    options.targetNodeModulesPath,
    options.packageName
  );
  const dependencyPackageJson = JSON.parse(
    await readFile(join(sourcePackagePath, "package.json"), "utf8")
  ) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  await mkdir(dirname(targetPackagePath), { recursive: true });
  await cp(sourcePackagePath, targetPackagePath, {
    recursive: true,
    dereference: true
  });

  for (const dependencyName of Object.keys({
    ...dependencyPackageJson.dependencies,
    ...dependencyPackageJson.optionalDependencies
  })) {
    await copyInstalledDependency({
      copiedPackages: options.copiedPackages,
      packageName: dependencyName,
      targetNodeModulesPath: options.targetNodeModulesPath
    });
  }
}

function resolveNodeModulesPackagePath(nodeModulesPath: string, packageName: string): string {
  return join(nodeModulesPath, ...packageName.split("/"));
}

async function waitForViewerServer(
  child: ReturnType<typeof spawn>
): Promise<URL> {
  return new Promise((resolvePromise, rejectPromise) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      rejectPromise(
        new Error(`Timed out waiting for viewer server\nstdout:\n${stdout}\nstderr:\n${stderr}`)
      );
    }, 15_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;

      const match = stdout.match(/viewer available at (http:\/\/[^\s]+)/);

      if (!match) {
        return;
      }

      clearTimeout(timeout);
      resolvePromise(new URL(match[1]));
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      rejectPromise(
        new Error(
          `Viewer server exited before becoming ready (code: ${code ?? "unknown"}, signal: ${signal ?? "none"})\nstdout:\n${stdout}\nstderr:\n${stderr}`
        )
      );
    });
  });
}

async function waitForChildExit(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("exit", () => {
      resolvePromise();
    });
  });
}

async function assertGeneratedInitSkeleton(rootPath: string): Promise<void> {
  const requiredPaths = [
    join(rootPath, "ddd-spec", "canonical", "index.yaml"),
    join(rootPath, "ddd-spec", "canonical", "objects"),
    join(rootPath, "ddd-spec", "canonical", "commands"),
    join(rootPath, "ddd-spec", "canonical", "events"),
    join(rootPath, "ddd-spec", "canonical", "aggregates"),
    join(rootPath, "ddd-spec", "canonical", "processes"),
    join(rootPath, "ddd-spec", "canonical", "vocabulary"),
    join(rootPath, "ddd-spec", "canonical", "objects", "work-item.object.yaml"),
    join(rootPath, "ddd-spec", "canonical", "commands", "create-work-item.command.yaml"),
    join(rootPath, "ddd-spec", "canonical", "events", "work-item-created.event.yaml"),
    join(rootPath, "ddd-spec", "canonical", "aggregates", "work-item.aggregate.yaml"),
    join(rootPath, "ddd-spec", "canonical", "processes", "work-item-lifecycle.process.yaml"),
    join(rootPath, "ddd-spec", "canonical", "vocabulary", "viewer-detail-semantics.yaml")
  ];

  for (const path of requiredPaths) {
    await access(path);
  }
}

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function runCommand(
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      if (signal) {
        rejectPromise(new Error(`${command} exited from signal ${signal}\n${stderr}`));
        return;
      }

      rejectPromise(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}\n${stderr}`
        )
      );
    });
  });
}
