import { fileURLToPath } from "node:url";

export interface ExampleFieldRequirement {
  objectId: string;
  fieldId: string;
  required: boolean;
}

export interface ExampleFieldStructureExpectation {
  objectId: string;
  fieldId: string;
  structure: "enum" | "reference" | "scalar";
  target?: string;
}

export interface ExampleRelationExpectation {
  objectId: string;
  relationId: string;
  kind: "association" | "composition" | "reference";
  target: string;
  field?: string;
  cardinality?: "1" | "0..1" | "0..n" | "1..n";
  description?: string;
}

export interface ExampleAdvance {
  sourceStage: string;
  eventType: string;
  targetStage: string;
}

export interface ExamplePaths {
  rootDirPath: string;
  bundlePath: string;
  analysisPath: string;
  viewerPath: string;
  typescriptPath: string;
}

export interface ExampleFixture {
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
  fieldStructures?: readonly ExampleFieldStructureExpectation[];
  relations?: readonly ExampleRelationExpectation[];
}

export interface PackedCliTarball {
  packedPaths: readonly string[];
  tarballPath: string;
  tempDirPath: string;
}

export type InitTemplateId = "default" | "minimal" | "order-payment";

function toAbsolutePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

export const EXAMPLE_FIXTURES: readonly ExampleFixture[] = [
  {
    id: "order-payment",
    configPath: toAbsolutePath("../../../examples/order-payment/ddd-spec.config.yaml"),
    entryPath: toAbsolutePath("../../../examples/order-payment/canonical/index.yaml"),
    expectedPaths: {
      rootDirPath: toAbsolutePath("../../../examples/order-payment/artifacts"),
      bundlePath: toAbsolutePath("../../../examples/order-payment/artifacts/business-spec.json"),
      analysisPath: toAbsolutePath(
        "../../../examples/order-payment/artifacts/business-spec.analysis.json"
      ),
      viewerPath: toAbsolutePath(
        "../../../examples/order-payment/artifacts/business-viewer/viewer-spec.json"
      ),
      typescriptPath: toAbsolutePath(
        "../../../examples/order-payment/generated/order-payment.generated.ts"
      )
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
    fieldRequirements: [
      {
        objectId: "Payment",
        fieldId: "orderId",
        required: true
      }
    ],
    fieldStructures: [
      {
        objectId: "Order",
        fieldId: "status",
        structure: "enum",
        target: "OrderStatus"
      },
      {
        objectId: "Payment",
        fieldId: "orderId",
        structure: "reference",
        target: "Order"
      },
      {
        objectId: "Payment",
        fieldId: "paymentStatus",
        structure: "enum",
        target: "PaymentStatus"
      }
    ],
    relations: [
      {
        objectId: "Payment",
        relationId: "settlesOrder",
        kind: "reference",
        target: "Order",
        field: "orderId",
        description: "支付记录结算对应订单。"
      }
    ]
  },
  {
    id: "content-moderation",
    configPath: toAbsolutePath("../../../examples/content-moderation/ddd-spec.config.yaml"),
    entryPath: toAbsolutePath("../../../examples/content-moderation/canonical/index.yaml"),
    expectedPaths: {
      rootDirPath: toAbsolutePath("../../../examples/content-moderation/artifacts"),
      bundlePath: toAbsolutePath(
        "../../../examples/content-moderation/artifacts/business-spec.json"
      ),
      analysisPath: toAbsolutePath(
        "../../../examples/content-moderation/artifacts/business-spec.analysis.json"
      ),
      viewerPath: toAbsolutePath(
        "../../../examples/content-moderation/artifacts/business-viewer/viewer-spec.json"
      ),
      typescriptPath: toAbsolutePath(
        "../../../examples/content-moderation/generated/content-moderation.generated.ts"
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
        fieldId: "moderationCaseId",
        required: true
      },
      {
        objectId: "Publication",
        fieldId: "channel",
        required: false
      }
    ],
    fieldStructures: [
      {
        objectId: "ModerationCase",
        fieldId: "moderationStatus",
        structure: "enum",
        target: "ModerationStatus"
      },
      {
        objectId: "Publication",
        fieldId: "moderationCaseId",
        structure: "reference",
        target: "ModerationCase"
      },
      {
        objectId: "Publication",
        fieldId: "publicationStatus",
        structure: "enum",
        target: "PublicationStatus"
      }
    ],
    relations: [
      {
        objectId: "ModerationCase",
        relationId: "approvedPublication",
        kind: "composition",
        target: "Publication",
        cardinality: "0..1",
        description: "审核工单在内容通过后会产出一条发布记录。"
      },
      {
        objectId: "Publication",
        relationId: "sourceModerationCase",
        kind: "reference",
        target: "ModerationCase",
        field: "moderationCaseId",
        description: "发布记录回指触发它的审核工单。"
      }
    ]
  }
] as const;

export const ZERO_CONFIG_FIXTURE = EXAMPLE_FIXTURES[0];
export const DEFAULT_SCHEMA_PATH = toAbsolutePath("../../ddd-spec-core/schema/business-spec.schema.json");
export const CORE_SCHEMA_DIR_PATH = toAbsolutePath("../../ddd-spec-core/schema");
export const CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH = toAbsolutePath(
  "../../../test/fixtures/connection-card-review/canonical/index.yaml"
);
export const REPO_SCENARIO_ENTRY_PATH = toAbsolutePath(
  "../../../scenarios/connection-card-review/canonical/index.yaml"
);
export const CLI_DIST_ENTRY_PATH = toAbsolutePath("../dist/ddd-spec-cli/cli.js");
export const CLI_DIST_INDEX_PATH = toAbsolutePath("../dist/ddd-spec-cli/index.js");
export const CLI_DIST_SCHEMA_DIR_PATH = toAbsolutePath("../dist/ddd-spec-core/schema");
export const CLI_DIST_SCHEMA_PATH = toAbsolutePath(
  "../dist/ddd-spec-core/schema/business-spec.schema.json"
);
export const CLI_DIST_VIEWER_DIR_PATH = toAbsolutePath("../dist/ddd-spec-cli/static/viewer");
export const CLI_DIST_VIEWER_INDEX_PATH = toAbsolutePath(
  "../dist/ddd-spec-cli/static/viewer/index.html"
);
export const CLI_DIST_VIEWER_GENERATED_SPEC_PATH = toAbsolutePath(
  "../dist/ddd-spec-cli/static/viewer/generated/viewer-spec.json"
);
export const REPO_ROOT_PATH = toAbsolutePath("../../../");
export const REPO_ROOT_NODE_MODULES_PATH = toAbsolutePath("../../../node_modules");
export const REPO_VIEWER_CONFIG_PATH = toAbsolutePath(
  "../../../apps/ddd-spec-viewer/ddd-spec.config.yaml"
);
export const WORKSPACE_SCHEMA_DIR_RELATIVE_PATH = ".vscode/ddd-spec/schema";
export const SCHEMA_FILE_NAMES = [
  "business-spec.schema.json",
  "canonical-index.schema.json",
  "object.schema.json",
  "command.schema.json",
  "event.schema.json",
  "aggregate.schema.json",
  "process.schema.json",
  "viewer-detail-semantics.schema.json"
] as const;
