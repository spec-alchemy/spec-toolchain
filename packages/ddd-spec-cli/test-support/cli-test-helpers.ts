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
  isAggregateObjectSpec,
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
  type ExampleFixture,
  type InitTemplateId,
  type PackedCliTarball,
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

    if (!isAggregateObjectSpec(object)) {
      throw new Error(`Expected aggregate object ${requirement.objectId}`);
    }

    const field = mustFind(object.fields, (candidate) => candidate.id === requirement.fieldId);

    assert.equal(field.required, requirement.required);
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
        .map(
          (edge) =>
            `${getDetailValue(edge.details, "event.type")}|${getDetailValue(edge.details, "event.target_stage")}`
        )
    ),
    sortStrings(
      example.processAdvances.map(
        (advance) => `${advance.eventType}|${advance.targetStage}`
      )
    )
  );
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
      assert.ok(isAggregateObjectSpec(approvalObject));
      assert.equal(approvalObject.role, "aggregate");
      assert.equal(approvalObject.lifecycleField, "status");
      assert.deepEqual(approvalObject.lifecycle, ["draft", "submitted", "approved", "rejected"]);
      assert.deepEqual(approvalObject.fields.at(-1), {
        id: "status",
        type: "ApprovalRequestStatus",
        required: true,
        structure: "enum",
        target: "ApprovalRequestStatus",
        description: "Lifecycle field mirrored by the aggregate states and the workflow stages."
      });
      assert.ok(!isAggregateObjectSpec(approvalStatus));
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
      assert.ok(isAggregateObjectSpec(minimalObject));
      assert.equal(minimalObject.role, "aggregate");
      assert.equal(minimalObject.lifecycleField, "status");
      assert.deepEqual(minimalObject.lifecycle, ["draft", "active"]);
      assert.deepEqual(minimalObject.fields.at(-1), {
        id: "status",
        type: "ExampleRecordStatus",
        required: true,
        structure: "enum",
        target: "ExampleRecordStatus",
        description: "Lifecycle field used by the minimal aggregate and process."
      });
      assert.ok(!isAggregateObjectSpec(minimalStatus));
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
      const orderStatus = mustFind(spec.domain.objects, (object) => object.id === "OrderStatus");
      const paymentStatus = mustFind(
        spec.domain.objects,
        (object) => object.id === "PaymentStatus"
      );

      assert.equal(spec.id, "order-payment");
      assert.deepEqual(spec.domain.objects.map((object) => object.id), [
        "Order",
        "Payment",
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
      assert.ok(isAggregateObjectSpec(orderObject));
      assert.equal(orderObject.role, "aggregate");
      assert.equal(orderObject.lifecycleField, "status");
      assert.deepEqual(orderObject.lifecycle, ["draft", "submitted"]);
      assert.deepEqual(orderObject.fields.at(-1), {
        id: "status",
        type: "OrderStatus",
        required: true,
        structure: "enum",
        target: "OrderStatus",
        description: "Lifecycle field mirrored by the order aggregate states."
      });
      assert.ok(isAggregateObjectSpec(paymentObject));
      assert.equal(paymentObject.role, "aggregate");
      assert.equal(paymentObject.lifecycleField, "paymentStatus");
      assert.deepEqual(paymentObject.lifecycle, ["pending", "confirmed"]);
      assert.deepEqual(paymentObject.fields[1], {
        id: "orderId",
        type: "uuid",
        required: true,
        structure: "reference",
        target: "Order",
        description: "Connects the payment back to the order it settles."
      });
      assert.deepEqual(paymentObject.relations, [
        {
          id: "settlesOrder",
          kind: "reference",
          target: "Order",
          field: "orderId",
          description: "Payment settles the order it references."
        }
      ]);
      assert.ok(!isAggregateObjectSpec(orderStatus));
      assert.equal(orderStatus.role, "enum");
      assert.deepEqual(orderStatus.values, ["draft", "submitted"]);
      assert.ok(!isAggregateObjectSpec(paymentStatus));
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
