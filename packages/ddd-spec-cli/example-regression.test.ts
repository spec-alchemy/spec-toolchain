import assert from "node:assert/strict";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
import type {
  EnsureViewerDependenciesOptions,
  LaunchViewerOptions
} from "./viewer.js";

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

test("CLI help keeps --config hidden and documents zero-config defaults", () => {
  const usageText = buildUsageText();

  assert.doesNotMatch(usageText, /--config/);
  assert.match(usageText, /Standard workflow:/);
  assert.match(usageText, /\n  init\n/);
  assert.match(usageText, /\n  ddd-spec init\n/);
  assert.match(usageText, /edit ddd-spec\/canonical\//);
  assert.match(usageText, /\n  viewer \[-- <viewer-args\.\.\.>\]\n/);
  assert.match(usageText, /ddd-spec\/canonical\/index\.yaml/);
  assert.match(usageText, /\.ddd-spec\//);
});

test("root package scripts expose zero-config entrypoints while legacy names delegate", async () => {
  const packageSource = await readFile(toAbsolutePath("../../package.json"), "utf8");
  const packageJson = JSON.parse(packageSource) as {
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts["ddd-spec:init"], "node --import tsx packages/ddd-spec-cli/cli.ts init");
  assert.equal(
    packageJson.scripts["ddd-spec:validate"],
    "node --import tsx packages/ddd-spec-cli/cli.ts validate"
  );
  assert.equal(packageJson.scripts["build:design-spec"], "npm run ddd-spec:build");
  assert.equal(packageJson.scripts["verify:design-spec"], "npm run ddd-spec:verify");
  assert.equal(packageJson.scripts["dev:design-spec-viewer"], "npm run ddd-spec:viewer");
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

test("CLI viewer rebuilds the zero-config viewer artifact and launches the existing viewer app", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-zero-config-viewer-"));
  let ensuredDependenciesFor: EnsureViewerDependenciesOptions | undefined;
  let launchOptions: LaunchViewerOptions | undefined;

  try {
    await copyExampleCanonicalToZeroConfigRoot(tempDir, ZERO_CONFIG_FIXTURE.id);
    await writeViewerAppStub(tempDir);

    await runCliCommand(["viewer", "--", "--host", "0.0.0.0"], {
      cwd: tempDir,
      viewerCommandHooks: {
        ensureViewerDependencies: async (options) => {
          ensuredDependenciesFor = options;
        },
        launchViewer: async (options) => {
          launchOptions = options;
        }
      }
    });

    assert.deepEqual(ensuredDependenciesFor, {
      appDirPath: join(tempDir, "apps", "design-spec-viewer")
    });
    assert.ok(launchOptions);
    assert.equal(
      launchOptions.defaultSpecPath,
      join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json")
    );
    assert.equal(
      launchOptions.defaultSpecLabel,
      "./.ddd-spec/artifacts/viewer-spec.json"
    );
    assert.equal(
      launchOptions.defaultSpecUrlPath,
      toViteFsUrlPath(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"))
    );
    assert.deepEqual(launchOptions.args, ["--host", "0.0.0.0"]);

    const viewer = JSON.parse(
      await readFile(join(tempDir, ".ddd-spec", "artifacts", "viewer-spec.json"), "utf8")
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

async function writeViewerAppStub(rootPath: string): Promise<void> {
  const appDirPath = join(rootPath, "apps", "design-spec-viewer");

  await mkdir(appDirPath, { recursive: true });
  await writeFile(
    join(appDirPath, "package.json"),
    JSON.stringify(
      {
        name: "design-spec-viewer-test-stub",
        private: true
      },
      null,
      2
    ),
    "utf8"
  );
}

function toViteFsUrlPath(path: string): string {
  const normalizedPath = path.replaceAll("\\", "/");
  const rootedPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

  return `/@fs${encodeURI(rootedPath)}`;
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
