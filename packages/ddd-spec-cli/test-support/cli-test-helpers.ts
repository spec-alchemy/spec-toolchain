import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parse, type ParseError } from "jsonc-parser";
import type {
  BusinessSpec,
  BusinessSpecAnalysis,
  ObjectSpec,
  ProcessSpec
} from "../../ddd-spec-core/index.js";
import {
  hasObjectFields,
  isEntityObjectSpec,
  loadBusinessSpec
} from "../../ddd-spec-core/index.js";
import type {
  BusinessViewerSpec,
  ViewerDetailItem,
  ViewerEdgeSpec
} from "../../ddd-spec-viewer-contract/index.js";
import YAML from "yaml";
import type { ViewerDevSessionStatus } from "../viewer-dev-session.js";
import {
  CORE_SCHEMA_DIR_PATH,
  EXAMPLE_FIXTURES,
  type ExampleAdvance,
  type ExampleFieldStructureExpectation,
  type ExampleFixture,
  type InitTemplateId,
  type PackedCliTarball,
  type ExampleRelationExpectation,
  REPO_ROOT_NODE_MODULES_PATH,
  REPO_ROOT_PATH,
  SCHEMA_FILE_NAMES,
  WORKSPACE_SCHEMA_DIR_RELATIVE_PATH
} from "./cli-test-fixtures.js";

export function assertExampleBundle(bundle: BusinessSpec, example: ExampleFixture): void {
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

    if (!hasObjectFields(object)) {
      throw new Error(`Expected object with fields ${requirement.objectId}`);
    }

    const field = mustFind(object.fields, (candidate) => candidate.id === requirement.fieldId);

    assert.equal(field.required, requirement.required);
  }

  for (const expectation of example.fieldStructures ?? []) {
    assertExampleFieldStructure(bundle, expectation);
  }

  for (const expectation of example.relations ?? []) {
    assertExampleRelation(bundle, expectation);
  }
}

export function assertExampleAnalysis(
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

export function assertExampleViewer(viewer: BusinessViewerSpec, example: ExampleFixture): void {
  assert.equal(viewer.viewerVersion, 3);
  assert.equal(viewer.specId, example.id);
  assert.deepEqual(
    viewer.views.map((view) => view.id),
    ["context-map", "scenario-story", "message-flow", "lifecycle", "domain-structure"]
  );
  assert.deepEqual(
    viewer.views.map((view) => view.kind),
    ["context-map", "scenario-story", "message-flow", "lifecycle", "domain-structure"]
  );
  assert.deepEqual(
    viewer.views.map((view) => view.navigation.order),
    [10, 20, 30, 40, 50]
  );
  assert.equal(viewer.views[0]?.navigation.default, true);

  const contextMapView = mustFind(viewer.views, (view) => view.id === "context-map");
  const scenarioStoryView = mustFind(viewer.views, (view) => view.id === "scenario-story");
  const messageFlowView = mustFind(viewer.views, (view) => view.id === "message-flow");
  const lifecycleView = mustFind(viewer.views, (view) => view.id === "lifecycle");
  const domainStructureView = mustFind(
    viewer.views,
    (view) => view.id === "domain-structure"
  );
  const expectedEnumIds = unique(
    (example.fieldStructures ?? [])
      .filter((expectation) => expectation.ref?.kind === "enum")
      .map((expectation) => expectation.ref?.objectId as string)
  );

  assert.deepEqual(
    sortStrings(
      contextMapView.nodes
        .filter((node) => node.kind === "aggregate")
        .map((node) => getDetailValue(node.details, "aggregate.id"))
    ),
    sortStrings(example.aggregateIds)
  );
  assert.deepEqual(
    sortStrings(
      lifecycleView.nodes
        .filter((node) => node.kind === "aggregate")
        .map((node) => getDetailValue(node.details, "aggregate.id"))
    ),
    sortStrings(example.aggregateIds)
  );
  assert.deepEqual(
    sortStrings(
      domainStructureView.nodes
        .filter((node) => node.kind === "aggregate")
        .map((node) => getDetailValue(node.details, "aggregate.id"))
    ),
    sortStrings(example.aggregateIds)
  );
  assert.equal(
    contextMapView.nodes.filter((node) => node.kind === "context").length,
    1
  );
  assert.deepEqual(
    sortStrings(
      contextMapView.nodes
        .filter((node) => node.kind === "scenario")
        .map((node) => getDetailValue(node.details, "scenario.id"))
    ),
    [example.processId]
  );
  assert.deepEqual(
    sortStrings(
      domainStructureView.nodes
        .filter((node) => node.kind === "entity")
        .map((node) => getDetailValue(node.details, "object.id"))
    ),
    sortStrings(example.aggregateIds)
  );
  assert.deepEqual(
    sortStrings(
      domainStructureView.nodes
        .filter((node) => node.kind === "enum")
        .map((node) => getDetailValue(node.details, "object.id"))
    ),
    sortStrings(expectedEnumIds)
  );
  assert.deepEqual(
    sortStrings(
      domainStructureView.nodes
        .filter((node) => node.kind === "entity")
        .map((node) => getDetailValue(node.details, "object.role"))
    ),
    sortStrings(example.aggregateIds.map(() => "entity"))
  );
  assert.deepEqual(
    sortStrings(
      domainStructureView.nodes
        .filter((node) => node.kind === "enum")
        .map((node) => getDetailValue(node.details, "object.role"))
    ),
    sortStrings(expectedEnumIds.map(() => "enum"))
  );
  assert.deepEqual(
    sortStrings(
      scenarioStoryView.nodes
        .filter((node) => node.kind === "scenario-step")
        .map((node) => getDetailValue(node.details, "step.id"))
    ),
    sortStrings(example.stageIds)
  );
  assert.deepEqual(
    sortStrings(
      scenarioStoryView.nodes
        .filter(
          (node) =>
            node.kind === "scenario-step" &&
            getDetailValue(node.details, "step.final") === "yes"
        )
        .map((node) => getDetailValue(node.details, "step.id"))
    ),
    sortStrings(example.finalStageIds)
  );
  assert.deepEqual(
    sortStrings(
      scenarioStoryView.edges
        .filter((edge) => edge.kind === "sequence")
        .map((edge) => formatAdvanceFromDetails(edge, "relation.from", "message.type", "relation.to"))
    ),
    sortStrings(example.processAdvances.map(formatAdvance))
  );
  assert.deepEqual(
    sortStrings(
      messageFlowView.edges
        .filter(
          (edge) =>
            edge.kind === "message-flow" &&
            edge.label === "advances" &&
            hasDetailValue(edge.details, "relation.to")
        )
        .map(
          (edge) =>
            `${getDetailValue(edge.details, "message.type")}|${getDetailValue(edge.details, "relation.to")}`
        )
    ),
    sortStrings(
      example.processAdvances.map(
        (advance) => `${advance.eventType}|${advance.targetStage}`
      )
    )
  );
  assert.deepEqual(
    sortStrings(
      domainStructureView.edges
        .filter((edge) => edge.kind === "association")
        .map((edge) => formatStructureFieldEdge(edge))
    ),
    sortStrings(
      (example.fieldStructures ?? [])
        .filter((expectation) => expectation.ref?.kind === "enum")
        .map(
          (expectation) =>
            `${expectation.objectId}|${expectation.fieldId}|${expectation.ref?.objectId}`
        )
    )
  );
  assert.equal(
    domainStructureView.edges.length,
    collectExpectedDomainStructureEdgeCount(example)
  );
  for (const edge of domainStructureView.edges) {
    assert.equal(getDetailValue(edge.details, "relation.kind"), edge.kind);

    if (edge.cardinality) {
      assert.equal(getDetailValue(edge.details, "relation.cardinality"), edge.cardinality);
    } else {
      assert.equal(getOptionalDetailValue(edge.details, "relation.cardinality"), undefined);
    }
  }

  for (const aggregateId of example.aggregateIds) {
    const entityNode = mustFind(
      domainStructureView.nodes,
      (candidate) =>
        candidate.kind === "entity" &&
        getDetailValue(candidate.details, "object.id") === aggregateId
    );

    assert.equal(entityNode.parentId, toDomainStructureAggregateGroupId(aggregateId));
  }

  for (const [objectId, aggregateId] of collectOwnedDomainStructureObjects(example).entries()) {
    const node = mustFind(
      domainStructureView.nodes,
      (candidate) => getOptionalDetailValue(candidate.details, "object.id") === objectId
    );

    assert.equal(node.parentId, toDomainStructureAggregateGroupId(aggregateId));
  }

  for (const expectation of example.fieldStructures ?? []) {
    const kind = toExpectedDomainStructureFieldEdgeKind(expectation);
    const ref = expectation.ref;

    if (!kind || !ref) {
      continue;
    }

    const edge = mustFind(
      domainStructureView.edges,
      (candidate) =>
        candidate.kind === kind &&
        getDetailValue(candidate.details, "relation.from") === expectation.objectId &&
        getDetailValue(candidate.details, "relation.field") === expectation.fieldId &&
        getDetailValue(candidate.details, "relation.to") === ref.objectId
    );

    assert.equal(edge.label, toReadableDomainStructureLabel(expectation.fieldId));
    const expectedCardinality = ref.cardinality ?? toExpectedFieldRefCardinality(example, expectation);

    if (expectedCardinality) {
      assert.equal(edge.cardinality, expectedCardinality);
    }
  }

  for (const relationExpectation of example.relations ?? []) {
    const edge = mustFind(
      domainStructureView.edges,
      (candidate) =>
        candidate.kind === relationExpectation.kind &&
        getDetailValue(candidate.details, "relation.from") === relationExpectation.objectId &&
        getDetailValue(candidate.details, "relation.to") === relationExpectation.target
    );

    assert.equal(edge.label, toReadableDomainStructureLabel(relationExpectation.relationId));
    assert.equal(getOptionalDetailValue(edge.details, "relation.field"), undefined);
    assert.equal(edge.cardinality, relationExpectation.cardinality);
    assert.equal(edge.description, relationExpectation.description);
  }
}

export async function copyExampleCanonicalToZeroConfigRoot(
  targetRootPath: string,
  exampleId: ExampleFixture["id"]
): Promise<void> {
  await cp(
    resolve(REPO_ROOT_PATH, "examples", exampleId, "canonical"),
    join(targetRootPath, "ddd-spec", "canonical"),
    { recursive: true }
  );
}

function assertExampleFieldStructure(
  bundle: BusinessSpec,
  expectation: ExampleFieldStructureExpectation
): void {
  const object = mustFind(bundle.domain.objects, (candidate) => candidate.id === expectation.objectId);

  if (!hasObjectFields(object)) {
    throw new Error(`Expected object with fields ${expectation.objectId}`);
  }

  const field = mustFind(object.fields, (candidate) => candidate.id === expectation.fieldId);

  assert.deepEqual(field.ref, expectation.ref);
}

function assertExampleRelation(
  bundle: BusinessSpec,
  expectation: ExampleRelationExpectation
): void {
  const object = mustFind(bundle.domain.objects, (candidate) => candidate.id === expectation.objectId);

  if (!hasObjectFields(object)) {
    throw new Error(`Expected object with relations ${expectation.objectId}`);
  }

  const relation = mustFind(object.relations ?? [], (candidate) => candidate.id === expectation.relationId);

  assert.equal(relation.kind, expectation.kind);
  assert.equal(relation.target, expectation.target);
  assert.equal(relation.cardinality, expectation.cardinality);
  assert.equal(relation.description, expectation.description);
}

export async function writeExampleConfig(options: {
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

export function getInstalledCliEntryPath(installedPackagePath: string): string {
  return join(installedPackagePath, "dist", "ddd-spec-cli", "cli.js");
}

export async function packPublishedCliTarball(): Promise<PackedCliTarball> {
  const tempDirPath = await mkdtemp(join(tmpdir(), "ddd-spec-packed-cli-"));
  const npmCacheDir = join(tempDirPath, "npm-cache");

  try {
    const result = await runCommand(
      getNpmCommand(),
      [
        "pack",
        "--json",
        "--ignore-scripts",
        "--pack-destination",
        tempDirPath,
        "--workspace=packages/ddd-spec-cli"
      ],
      {
        cwd: REPO_ROOT_PATH,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir
        }
      }
    );
    const [packSummary] = JSON.parse(result.stdout.trim()) as [
      {
        filename: string;
        files: Array<{
          path: string;
        }>;
      }
    ];
    const tarballPath = join(tempDirPath, packSummary.filename);

    await access(tarballPath);

    return {
      packedPaths: packSummary.files.map((file) => file.path),
      tarballPath,
      tempDirPath
    };
  } catch (error) {
    await rm(tempDirPath, { recursive: true, force: true });
    throw error;
  }
}

export async function installPublishedCliTarball(consumerRootPath: string): Promise<string> {
  const packedCliTarball = await packPublishedCliTarball();
  const installedPackagePath = join(
    consumerRootPath,
    "node_modules",
    "@knowledge-alchemy",
    "ddd-spec"
  );
  const targetNodeModulesPath = join(consumerRootPath, "node_modules");
  const copiedPackages = new Set<string>();

  try {
    await mkdir(installedPackagePath, { recursive: true });
    await runCommand(
      "tar",
      ["-xzf", packedCliTarball.tarballPath, "-C", installedPackagePath, "--strip-components=1"],
      {
        cwd: REPO_ROOT_PATH
      }
    );

    const packageJson = JSON.parse(
      await readFile(join(installedPackagePath, "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>;
    };

    for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
      await copyInstalledDependency({
        copiedPackages,
        packageName: dependencyName,
        targetNodeModulesPath
      });
    }

    return installedPackagePath;
  } finally {
    await rm(packedCliTarball.tempDirPath, { recursive: true, force: true });
  }
}

export async function waitForViewerServer(
  child: ChildProcessWithoutNullStreams
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

export async function readViewerDevSessionStatus(
  viewerUrl: URL
): Promise<ViewerDevSessionStatus> {
  const response = await fetch(new URL("/__ddd-spec/dev-session", viewerUrl));

  assert.equal(response.status, 200);

  return response.json() as Promise<ViewerDevSessionStatus>;
}

export async function waitForChildExit(child: ChildProcessWithoutNullStreams): Promise<void> {
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

export function collectChildOutput(child: ChildProcessWithoutNullStreams): {
  stderr: string;
  stdout: string;
} {
  const output = {
    stderr: "",
    stdout: ""
  };

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output.stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output.stderr += chunk;
  });

  return output;
}

export async function waitForCondition(
  condition: (() => boolean | Promise<boolean>),
  timeoutMs = 15_000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime <= timeoutMs) {
    if (await condition()) {
      return;
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 50);
    });
  }

  throw new Error(`Timed out waiting for condition after ${timeoutMs}ms`);
}

export function countMatches(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

export async function readOptionalTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return "";
    }

    throw error;
  }
}

export async function writeBrowserOpenStub(rootPath: string): Promise<void> {
  const binPath = join(rootPath, "bin");
  const stubSource = [
    "#!/bin/sh",
    "printf '%s\\n' \"$1\" >> \"$DDD_SPEC_BROWSER_OPEN_LOG\""
  ].join("\n");

  await mkdir(binPath, { recursive: true });

  for (const commandName of ["open", "xdg-open"]) {
    const commandPath = join(binPath, commandName);

    await writeFile(commandPath, `${stubSource}\n`, "utf8");
    await chmod(commandPath, 0o755);
  }
}

export async function assertGeneratedInitSkeleton(
  rootPath: string,
  templateId: InitTemplateId = "default"
): Promise<void> {
  const canonicalRootPath = join(rootPath, "ddd-spec", "canonical");
  const requiredPathsByTemplate: Record<InitTemplateId, readonly string[]> = {
    default: [
      join(canonicalRootPath, "index.yaml"),
      join(canonicalRootPath, "objects"),
      join(canonicalRootPath, "commands"),
      join(canonicalRootPath, "events"),
      join(canonicalRootPath, "aggregates"),
      join(canonicalRootPath, "processes"),
      join(canonicalRootPath, "vocabulary"),
      join(canonicalRootPath, "objects", "approval-request.object.yaml"),
      join(canonicalRootPath, "objects", "approval-request-status.object.yaml"),
      join(canonicalRootPath, "commands", "submit-approval-request.command.yaml"),
      join(canonicalRootPath, "commands", "approve-request.command.yaml"),
      join(canonicalRootPath, "commands", "reject-request.command.yaml"),
      join(canonicalRootPath, "events", "approval-request-submitted.event.yaml"),
      join(canonicalRootPath, "events", "approval-request-approved.event.yaml"),
      join(canonicalRootPath, "events", "approval-request-rejected.event.yaml"),
      join(canonicalRootPath, "aggregates", "approval-request.aggregate.yaml"),
      join(canonicalRootPath, "processes", "approval-request-workflow.process.yaml"),
      join(canonicalRootPath, "vocabulary", "viewer-detail-semantics.yaml")
    ],
    minimal: [
      join(canonicalRootPath, "index.yaml"),
      join(canonicalRootPath, "objects"),
      join(canonicalRootPath, "commands"),
      join(canonicalRootPath, "events"),
      join(canonicalRootPath, "aggregates"),
      join(canonicalRootPath, "processes"),
      join(canonicalRootPath, "vocabulary"),
      join(canonicalRootPath, "objects", "example-record.object.yaml"),
      join(canonicalRootPath, "objects", "example-record-status.object.yaml"),
      join(canonicalRootPath, "commands", "activate-example-record.command.yaml"),
      join(canonicalRootPath, "events", "example-record-activated.event.yaml"),
      join(canonicalRootPath, "aggregates", "example-record.aggregate.yaml"),
      join(canonicalRootPath, "processes", "example-record.process.yaml"),
      join(canonicalRootPath, "vocabulary", "viewer-detail-semantics.yaml")
    ],
    "order-payment": [
      join(canonicalRootPath, "index.yaml"),
      join(canonicalRootPath, "objects"),
      join(canonicalRootPath, "commands"),
      join(canonicalRootPath, "events"),
      join(canonicalRootPath, "aggregates"),
      join(canonicalRootPath, "processes"),
      join(canonicalRootPath, "vocabulary"),
      join(canonicalRootPath, "objects", "order.object.yaml"),
      join(canonicalRootPath, "objects", "payment.object.yaml"),
      join(canonicalRootPath, "objects", "order-status.object.yaml"),
      join(canonicalRootPath, "objects", "payment-status.object.yaml"),
      join(canonicalRootPath, "commands", "submit-order.command.yaml"),
      join(canonicalRootPath, "commands", "confirm-payment.command.yaml"),
      join(canonicalRootPath, "events", "order-submitted.event.yaml"),
      join(canonicalRootPath, "events", "payment-confirmed.event.yaml"),
      join(canonicalRootPath, "aggregates", "order.aggregate.yaml"),
      join(canonicalRootPath, "aggregates", "payment.aggregate.yaml"),
      join(canonicalRootPath, "processes", "order-payment.process.yaml"),
      join(canonicalRootPath, "vocabulary", "viewer-detail-semantics.yaml")
    ]
  };

  for (const path of requiredPathsByTemplate[templateId]) {
    await access(path);
  }

  const spec = await loadBusinessSpec({
    entryPath: join(canonicalRootPath, "index.yaml"),
    validateSemantics: false
  });

  switch (templateId) {
    case "default": {
      const approvalObject = mustFind(spec.domain.objects, (object) => object.id === "ApprovalRequest");
      const approvalProcess = spec.domain.processes[0];
      const approvalStatus = mustFind(
        spec.domain.objects,
        (object) => object.id === "ApprovalRequestStatus"
      );

      assert.equal(spec.id, "approval-workflow");
      assert.deepEqual(spec.domain.objects.map((object) => object.id), [
        "ApprovalRequest",
        "ApprovalRequestStatus"
      ]);
      assert.deepEqual(
        spec.domain.commands.map((command) => command.type),
        ["submitApprovalRequest", "approveRequest", "rejectRequest"]
      );
      assert.deepEqual(
        spec.domain.events.map((event) => event.type),
        ["ApprovalRequestSubmitted", "ApprovalRequestApproved", "ApprovalRequestRejected"]
      );
      assert.ok(isEntityObjectSpec(approvalObject));
      assert.equal(approvalObject.role, "entity");
      assert.equal(approvalObject.lifecycleField, "status");
      assert.deepEqual(approvalObject.lifecycle, ["draft", "submitted", "approved", "rejected"]);
      assert.deepEqual(approvalObject.fields.at(-1), {
        id: "status",
        type: "ApprovalRequestStatus",
        required: true,
        ref: {
          kind: "enum",
          objectId: "ApprovalRequestStatus"
        },
        description: "Lifecycle field mirrored by the aggregate states and the workflow stages."
      });
      assert.ok(!hasObjectFields(approvalStatus));
      assert.equal(approvalStatus.role, "enum");
      assert.deepEqual(approvalStatus.values, ["draft", "submitted", "approved", "rejected"]);
      assert.equal(approvalProcess.id, "approvalRequestWorkflow");
      assert.equal(approvalProcess.initialStage, "draftingRequest");
      assert.deepEqual(approvalProcess.uses.aggregates, {
        approval: "ApprovalRequest"
      });
      assert.deepEqual(approvalProcess.stages.draftingRequest.advancesOn, {
        ApprovalRequestSubmitted: "awaitingDecision"
      });
      assert.deepEqual(approvalProcess.stages.awaitingDecision.advancesOn, {
        ApprovalRequestApproved: "closedApproved",
        ApprovalRequestRejected: "closedRejected"
      });
      assert.equal(approvalProcess.stages.closedApproved.outcome, "requestApproved");
      assert.equal(approvalProcess.stages.closedRejected.outcome, "requestRejected");
      return;
    }
    case "minimal": {
      const minimalObject = mustFind(spec.domain.objects, (object) => object.id === "ExampleRecord");
      const minimalAggregate = spec.domain.aggregates[0];
      const minimalProcess = spec.domain.processes[0];
      const minimalStatus = mustFind(
        spec.domain.objects,
        (object) => object.id === "ExampleRecordStatus"
      );

      assert.equal(spec.id, "minimal-domain");
      assert.deepEqual(spec.domain.objects.map((object) => object.id), [
        "ExampleRecord",
        "ExampleRecordStatus"
      ]);
      assert.deepEqual(
        spec.domain.commands.map((command) => command.type),
        ["activateExampleRecord"]
      );
      assert.deepEqual(
        spec.domain.events.map((event) => event.type),
        ["ExampleRecordActivated"]
      );
      assert.deepEqual(
        spec.domain.processes.map((process) => process.id),
        ["exampleRecordLifecycle"]
      );
      assert.ok(isEntityObjectSpec(minimalObject));
      assert.equal(minimalObject.role, "entity");
      assert.equal(minimalObject.lifecycleField, "status");
      assert.deepEqual(minimalObject.lifecycle, ["draft", "active"]);
      assert.deepEqual(minimalObject.fields.at(-1), {
        id: "status",
        type: "ExampleRecordStatus",
        required: true,
        ref: {
          kind: "enum",
          objectId: "ExampleRecordStatus"
        },
        description: "Lifecycle field used by the minimal aggregate and process."
      });
      assert.ok(!hasObjectFields(minimalStatus));
      assert.equal(minimalStatus.role, "enum");
      assert.deepEqual(minimalStatus.values, ["draft", "active"]);
      assert.equal(minimalAggregate.objectId, "ExampleRecord");
      assert.equal(minimalAggregate.initial, "draft");
      assert.deepEqual(minimalAggregate.states.draft?.on, {
        activateExampleRecord: {
          target: "active",
          emit: {
            type: "ExampleRecordActivated",
            payloadFrom: {
              recordId: "$command.recordId"
            }
          }
        }
      });
      assert.deepEqual(minimalAggregate.states.active, {});
      assert.equal(minimalProcess.id, "exampleRecordLifecycle");
      assert.deepEqual(minimalProcess.uses.aggregates, {
        record: "ExampleRecord"
      });
      assert.deepEqual(minimalProcess.stages.draftingRecord.advancesOn, {
        ExampleRecordActivated: "activeRecord"
      });
      assert.equal(minimalProcess.stages.activeRecord.outcome, "recordActive");
      return;
    }
    case "order-payment": {
      const orderProcess = spec.domain.processes[0];
      const orderObject = mustFind(spec.domain.objects, (object) => object.id === "Order");
      const paymentObject = mustFind(spec.domain.objects, (object) => object.id === "Payment");
      const paymentSettlement = mustFind(
        spec.domain.objects,
        (object) => object.id === "PaymentSettlement"
      );
      const orderStatus = mustFind(spec.domain.objects, (object) => object.id === "OrderStatus");
      const paymentStatus = mustFind(
        spec.domain.objects,
        (object) => object.id === "PaymentStatus"
      );

      assert.equal(spec.id, "order-payment");
      assert.deepEqual(spec.domain.objects.map((object) => object.id), [
        "Order",
        "Payment",
        "PaymentSettlement",
        "OrderStatus",
        "PaymentStatus"
      ]);
      assert.deepEqual(
        spec.domain.commands.map((command) => command.type),
        ["submitOrder", "confirmPayment"]
      );
      assert.deepEqual(
        spec.domain.events.map((event) => event.type),
        ["OrderSubmitted", "PaymentConfirmed"]
      );
      assert.deepEqual(spec.domain.aggregates.map((aggregate) => aggregate.objectId), [
        "Order",
        "Payment"
      ]);
      assert.ok(isEntityObjectSpec(orderObject));
      assert.equal(orderObject.role, "entity");
      assert.equal(orderObject.lifecycleField, "status");
      assert.deepEqual(orderObject.lifecycle, ["draft", "submitted"]);
      assert.deepEqual(orderObject.fields.at(-1), {
        id: "status",
        type: "OrderStatus",
        required: true,
        ref: {
          kind: "enum",
          objectId: "OrderStatus"
        },
        description: "Lifecycle field mirrored by the order aggregate states."
      });
      assert.ok(isEntityObjectSpec(paymentObject));
      assert.equal(paymentObject.role, "entity");
      assert.equal(paymentObject.lifecycleField, "paymentStatus");
      assert.deepEqual(paymentObject.lifecycle, ["pending", "confirmed"]);
      assert.deepEqual(paymentObject.fields[1], {
        id: "orderId",
        type: "uuid",
        required: true,
        ref: {
          kind: "reference",
          objectId: "Order"
        },
        description: "Connects the payment back to the order it settles."
      });
      assert.deepEqual(paymentObject.fields[2], {
        id: "settlement",
        type: "PaymentSettlement",
        required: true,
        ref: {
          kind: "composition",
          objectId: "PaymentSettlement"
        },
        description: "Captures the settlement detail owned by the payment aggregate."
      });
      assert.ok(hasObjectFields(paymentSettlement));
      assert.equal(paymentSettlement.role, "value-object");
      assert.deepEqual(paymentSettlement.fields.map((field) => field.id), ["method", "confirmedAt"]);
      assert.ok(!hasObjectFields(orderStatus));
      assert.equal(orderStatus.role, "enum");
      assert.deepEqual(orderStatus.values, ["draft", "submitted"]);
      assert.ok(!hasObjectFields(paymentStatus));
      assert.equal(paymentStatus.role, "enum");
      assert.deepEqual(paymentStatus.values, ["pending", "confirmed"]);
      assert.equal(orderProcess.id, "orderPaymentProcess");
      assert.deepEqual(orderProcess.uses.aggregates, {
        order: "Order",
        payment: "Payment"
      });
      assert.deepEqual(orderProcess.stages.awaitingOrderSubmission.advancesOn, {
        OrderSubmitted: "awaitingPaymentConfirmation"
      });
      assert.deepEqual(orderProcess.stages.awaitingPaymentConfirmation.advancesOn, {
        PaymentConfirmed: "closedOrderPaid"
      });
      assert.equal(orderProcess.stages.closedOrderPaid.outcome, "orderPaid");
      return;
    }
  }
}

export async function assertGeneratedVsCodeWorkspaceConfig(options: {
  rootPath: string;
  skippedSchemaFiles?: readonly string[];
}): Promise<void> {
  const schemaRootPath = join(options.rootPath, WORKSPACE_SCHEMA_DIR_RELATIVE_PATH);
  const settingsPath = join(options.rootPath, ".vscode", "settings.json");
  const extensionsPath = join(options.rootPath, ".vscode", "extensions.json");
  const settings = parseJsoncObject(await readFile(settingsPath, "utf8"));
  const extensions = parseJsoncObject(await readFile(extensionsPath, "utf8"));
  const yamlSchemas = normalizeYamlSchemaMappings(settings["yaml.schemas"]);
  const recommendations = normalizeStringList(extensions.recommendations);

  for (const schemaFileName of SCHEMA_FILE_NAMES) {
    await access(join(schemaRootPath, schemaFileName));
  }

  await assertSchemaAssetsMatchCore(schemaRootPath);

  assertHasExpectedYamlSchemaMappings({
    rootPath: options.rootPath,
    schemaRootPath,
    yamlSchemas,
    skippedSchemaFiles: options.skippedSchemaFiles
  });
  assert.ok(recommendations.includes("redhat.vscode-yaml"));
  assert.equal(
    recommendations.filter((recommendation) => recommendation === "redhat.vscode-yaml").length,
    1
  );
}

export async function assertSchemaAssetsMatchCore(schemaRootPath: string): Promise<void> {
  for (const schemaFileName of SCHEMA_FILE_NAMES) {
    const [actual, expected] = await Promise.all([
      readFile(join(schemaRootPath, schemaFileName), "utf8"),
      readFile(join(CORE_SCHEMA_DIR_PATH, schemaFileName), "utf8")
    ]);

    assert.equal(actual, expected, `${schemaFileName} drifted from the core schema asset`);
  }
}

export function parseJsoncObject(source: string): Record<string, unknown> {
  const errors: ParseError[] = [];
  const parsed = parse(source, errors, {
    allowTrailingComma: true,
    disallowComments: false
  });

  assert.deepEqual(errors, []);
  assert.ok(parsed && typeof parsed === "object" && !Array.isArray(parsed));

  return parsed as Record<string, unknown>;
}

export function normalizeYamlSchemaMappings(value: unknown): Record<string, readonly string[]> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([schemaPath, globs]) => [
      schemaPath,
      normalizeStringList(globs)
    ])
  );
}

export function normalizeStringList(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }

  assert.ok(Array.isArray(value));
  assert.ok(value.every((entry) => typeof entry === "string"));

  return value as readonly string[];
}

export function toWorkspaceSchemaPath(rootPath: string, schemaPath: string): string {
  const relativePath = relative(rootPath, schemaPath).replace(/\\/g, "/");

  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    relativePath.startsWith("/")
  ) {
    return relativePath;
  }

  return `./${relativePath}`;
}

export async function runCommandResult(
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<{
  exitCode: number | null;
  signal: NodeJS.Signals | null;
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
      resolvePromise({
        exitCode: code,
        signal,
        stdout,
        stderr
      });
    });
  });
}

export async function runCommand(
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
  const result = await runCommandResult(command, args, options);

  if (result.exitCode === 0) {
    return {
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  if (result.signal) {
    throw new Error(`${command} exited from signal ${result.signal}\n${result.stderr}`);
  }

  throw new Error(
    `${command} ${args.join(" ")} exited with code ${result.exitCode ?? "unknown"}\n${result.stderr}`
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

function formatStructureFieldEdge(edge: ViewerEdgeSpec): string {
  return [
    getDetailValue(edge.details, "relation.from"),
    getDetailValue(edge.details, "relation.field"),
    getDetailValue(edge.details, "relation.to")
  ].join("|");
}

function collectExpectedDomainStructureEdgeCount(example: ExampleFixture): number {
  const edgeKeys = new Set<string>();

  for (const relation of example.relations ?? []) {
    edgeKeys.add(
      formatExpectedDomainStructureEdgeKey(
        relation.kind,
        relation.objectId,
        undefined,
        relation.target
      )
    );
  }

  for (const fieldStructure of example.fieldStructures ?? []) {
    const kind = toExpectedDomainStructureFieldEdgeKind(fieldStructure);

    if (!kind || !fieldStructure.ref) {
      continue;
    }

    edgeKeys.add(
      formatExpectedDomainStructureEdgeKey(
        kind,
        fieldStructure.objectId,
        fieldStructure.fieldId,
        fieldStructure.ref.objectId
      )
    );
  }

  return edgeKeys.size;
}

function collectOwnedDomainStructureObjects(
  example: ExampleFixture
): ReadonlyMap<string, string> {
  const adjacency = new Map<string, string[]>();
  const owners = new Map<string, string>();

  for (const fieldStructure of example.fieldStructures ?? []) {
    if (fieldStructure.ref?.kind !== "composition") {
      continue;
    }

    adjacency.set(fieldStructure.objectId, [
      ...(adjacency.get(fieldStructure.objectId) ?? []),
      fieldStructure.ref.objectId
    ]);
  }

  for (const relation of example.relations ?? []) {
    if (relation.kind !== "composition") {
      continue;
    }

    adjacency.set(relation.objectId, [
      ...(adjacency.get(relation.objectId) ?? []),
      relation.target
    ]);
  }

  for (const aggregateId of example.aggregateIds) {
    const queue = [...(adjacency.get(aggregateId) ?? [])];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const objectId = queue.shift() as string;

      if (visited.has(objectId)) {
        continue;
      }

      visited.add(objectId);
      owners.set(objectId, aggregateId);
      queue.push(...(adjacency.get(objectId) ?? []));
    }
  }

  return owners;
}

function formatExpectedDomainStructureEdgeKey(
  kind: string,
  objectId: string,
  fieldId: string | undefined,
  target: string
): string {
  return [kind, objectId, fieldId ?? "", target].join("|");
}

function toExpectedDomainStructureFieldEdgeKind(
  expectation: ExampleFieldStructureExpectation
): "association" | "composition" | "reference" | undefined {
  switch (expectation.ref?.kind) {
    case "enum":
      return "association";
    case "composition":
      return "composition";
    case "reference":
      return "reference";
    default:
      return undefined;
  }
}

function toExpectedFieldRefCardinality(
  example: ExampleFixture,
  expectation: ExampleFieldStructureExpectation
): "1" | "0..1" | "0..n" | "1..n" | undefined {
  if (expectation.ref?.cardinality) {
    return expectation.ref.cardinality;
  }

  const matchingRequirement = example.fieldRequirements.find(
    (candidate) =>
      candidate.objectId === expectation.objectId && candidate.fieldId === expectation.fieldId
  );

  if (!matchingRequirement) {
    return undefined;
  }

  return matchingRequirement.required ? "1" : "0..1";
}

function toDomainStructureAggregateGroupId(aggregateId: string): string {
  return `domain-structure:aggregate:${aggregateId}`;
}

function toReadableDomainStructureLabel(identifier: string): string {
  return identifier
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getDetailValue(details: readonly ViewerDetailItem[], semanticKey: string): string {
  const detail = details.find((candidate) => candidate.semanticKey === semanticKey);

  if (!detail) {
    throw new Error(`Expected detail ${semanticKey}`);
  }

  if (detail.value.kind !== "text") {
    throw new Error(`Expected text detail ${semanticKey}`);
  }

  return detail.value.text;
}

function hasDetailValue(details: readonly ViewerDetailItem[], semanticKey: string): boolean {
  return details.some((candidate) => candidate.semanticKey === semanticKey);
}

function getOptionalDetailValue(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): string | undefined {
  const detail = details.find((candidate) => candidate.semanticKey === semanticKey);

  if (!detail) {
    return undefined;
  }

  if (detail.value.kind !== "text") {
    throw new Error(`Expected text detail ${semanticKey}`);
  }

  return detail.value.text;
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort();
}

function unique<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
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

function assertHasExpectedYamlSchemaMappings(options: {
  rootPath: string;
  schemaRootPath: string;
  yamlSchemas: Record<string, readonly string[]>;
  skippedSchemaFiles?: readonly string[];
}): void {
  const expectedMappings = buildExpectedYamlSchemaMappings();
  const skippedSchemaFiles = new Set(options.skippedSchemaFiles ?? []);

  for (const [schemaFileName, expectedGlobs] of Object.entries(expectedMappings)) {
    if (skippedSchemaFiles.has(schemaFileName)) {
      continue;
    }

    const schemaPath = toWorkspaceSchemaPath(
      options.rootPath,
      join(options.schemaRootPath, schemaFileName)
    );

    assert.deepEqual(options.yamlSchemas[schemaPath], expectedGlobs);
  }
}

function buildExpectedYamlSchemaMappings(): Record<string, readonly string[]> {
  return {
    "canonical-index.schema.json": ["**/canonical/index.yaml"],
    "object.schema.json": ["**/canonical/objects/*.object.yaml"],
    "command.schema.json": ["**/canonical/commands/*.command.yaml"],
    "event.schema.json": ["**/canonical/events/*.event.yaml"],
    "aggregate.schema.json": ["**/canonical/aggregates/*.aggregate.yaml"],
    "process.schema.json": ["**/canonical/processes/*.process.yaml"],
    "viewer-detail-semantics.schema.json": ["**/canonical/vocabulary/*.yaml"]
  };
}

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
