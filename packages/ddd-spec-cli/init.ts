import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  loadBusinessSpec,
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics
} from "../ddd-spec-core/index.js";
import { logArtifact, logInfo } from "./console.js";
import { DEFAULT_SCHEMA_PATH, ZERO_CONFIG_ENTRY_PATH } from "./config.js";

const ZERO_CONFIG_CANONICAL_DIR = "ddd-spec/canonical";
const GITIGNORE_ENTRY = ".ddd-spec/";
const EXISTING_GITIGNORE_MATCHES = new Set([GITIGNORE_ENTRY, ".ddd-spec"]);

const LEGACY_SCAFFOLD_RELATIVE_PATHS = [
  `${ZERO_CONFIG_CANONICAL_DIR}/objects/work-item.object.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/commands/create-work-item.command.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/events/work-item-created.event.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/work-item.aggregate.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/processes/work-item-lifecycle.process.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/vocabulary/viewer-detail-semantics.yaml`
] as const;

const DEFAULT_TEMPLATE_FILES = [
  {
    relativePath: ZERO_CONFIG_ENTRY_PATH,
    source: `version: 1
id: approval-workflow
title: Approval Request Workflow
summary: Teaching template showing how a request moves from draft to review, then closes as approved or rejected.
vocabulary:
  viewerDetails: ./vocabulary/viewer-detail-semantics.yaml
domain:
  objects:
    - ./objects/approval-request.object.yaml
  commands:
    - ./commands/submit-approval-request.command.yaml
    - ./commands/approve-request.command.yaml
    - ./commands/reject-request.command.yaml
  events:
    - ./events/approval-request-submitted.event.yaml
    - ./events/approval-request-approved.event.yaml
    - ./events/approval-request-rejected.event.yaml
  aggregates:
    - ./aggregates/approval-request.aggregate.yaml
  processes:
    - ./processes/approval-request-workflow.process.yaml
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/vocabulary/viewer-detail-semantics.yaml`,
    source: `process.id:
  label: Process
  description: The business workflow you are modeling from its first stage to its closing outcomes.
process.initial_stage:
  label: Initial stage
  description: The stage where the workflow begins before any event has advanced it.
process.final_stages:
  label: Final stages
  description: The valid endings of the workflow after all required decisions have been made.
process.used_aggregates:
  label: Used aggregates
  description: The aggregate aliases that the process stages can bind to while the workflow runs.
stage.id:
  label: Stage
  description: A named step in the workflow that helps readers understand where the request is right now.
stage.final:
  label: Final
  description: Marks whether the stage is a terminal outcome instead of an active working step.
aggregate.id:
  label: Aggregate
  description: The aggregate that owns the lifecycle state and accepts the commands for this part of the workflow.
aggregate.state.id:
  label: State
  description: The lifecycle state that the aggregate is currently in.
behavior.accepted_commands:
  label: Accepted commands
  description: The commands that are legal while the aggregate remains in the current state.
behavior.observed_events:
  label: Observed events
  description: The events that this process stage listens for in order to move to the next stage.
stage.outcome:
  label: Outcome
  description: A short business result that explains how the workflow ended when it reached a final stage.
aggregate.lifecycle_field:
  label: Lifecycle field
  description: The object field that stores the aggregate lifecycle state.
aggregate.lifecycle:
  label: Lifecycle
  description: The full set of lifecycle states defined for the aggregate's object.
aggregate.referenced_by_stages:
  label: Referenced by stages
  description: The workflow stages that explicitly bind to this aggregate or one of its states.
aggregate.state.emitted_events:
  label: Emitted events
  description: The business facts that can be emitted after a command transitions the aggregate from this state.
aggregate.state.bound_by_stages:
  label: Bound by stages
  description: The process stages that teach readers how this state appears in the larger workflow.
event.type:
  label: Event
  description: A business fact that records what happened after the system handled a command.
relation.from:
  label: From
  description: The source state or stage for the relationship being shown.
relation.to:
  label: To
  description: The destination state or stage for the relationship being shown.
relation.label:
  label: Relation
  description: The semantic label that explains why two nodes are connected.
relation.kind:
  label: Kind
  description: The relationship category, such as state transition, stage binding, or process advance.
aggregate.initial_state:
  label: Initial state
  description: The lifecycle state where the aggregate begins before any command is accepted.
aggregate.state.reachable:
  label: Reachable
  description: Whether the state can actually be reached from the aggregate's initial state.
aggregate.state.outgoing_commands:
  label: Outgoing commands
  description: The commands that can transition the aggregate away from the current state.
command.type:
  label: Command
  description: An explicit business intention that asks the aggregate to do something.
transition.payload_mapping:
  label: Payload mapping
  description: How command fields are copied into the emitted event payload when a transition fires.
command.target_aggregate:
  label: Target aggregate
  description: The aggregate that receives the command and validates whether the action is allowed.
command.payload_fields:
  label: Payload fields
  description: The input fields required to issue the command and explain the modeled business action.
entity.description:
  label: Description
  description: The teaching text that explains the purpose of a command or event in this template.
transition.from_state:
  label: From state
  description: The aggregate state before the command is handled.
transition.to_state:
  label: To state
  description: The aggregate state after the command succeeds.
event.source_aggregate:
  label: Source aggregate
  description: The aggregate that emits the event after a successful state transition.
event.payload_fields:
  label: Payload fields
  description: The event data that downstream readers and process stages can rely on.
event.observed_by_stage:
  label: Observed by stage
  description: Whether the current stage listens to the event as a signal to advance the workflow.
event.advances_to:
  label: Advances to
  description: The stage that the workflow moves into after observing the event.
event.target_stage:
  label: Target stage
  description: The destination stage reached when the process advances on this event.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/approval-request.object.yaml`,
    source: `kind: object
id: ApprovalRequest
title: Approval Request
lifecycleField: status
lifecycle:
  - draft
  - submitted
  - approved
  - rejected
fields:
  - id: requestId
    type: uuid
    required: true
    description: Stable identifier carried through every command and event in the workflow.
  - id: requestTitle
    type: text
    required: true
    description: Human-readable title that tells approvers what decision they are being asked to make.
  - id: requestedBy
    type: uuid
    required: true
    description: Actor who created the request and supplied the initial business context.
  - id: approverId
    type: uuid
    required: false
    description: Approver assigned when the request leaves draft and enters review.
  - id: decisionNotes
    type: text
    required: false
    description: Optional rationale captured with the final approval or rejection decision.
  - id: status
    type: ApprovalRequestStatus
    required: true
    description: Lifecycle field mirrored by the aggregate states and the workflow stages.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/submit-approval-request.command.yaml`,
    source: `kind: command
type: submitApprovalRequest
target: ApprovalRequest
description: Move a draft approval request into review once the requester has provided the context an approver needs.
payload:
  fields:
    - id: requestId
      type: uuid
      required: true
      description: Links the submission back to the draft approval request.
    - id: requestTitle
      type: text
      required: true
      description: Names the change, spend, or policy decision that needs approval.
    - id: requestedBy
      type: uuid
      required: true
      description: Identifies who is asking for the approval.
    - id: approverId
      type: uuid
      required: true
      description: Assigns the approver who will make the decision in the next stage.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/approve-request.command.yaml`,
    source: `kind: command
type: approveRequest
target: ApprovalRequest
description: Accept the request and optionally capture notes that explain why the decision was approved.
payload:
  fields:
    - id: requestId
      type: uuid
      required: true
      description: Identifies the approval request being accepted.
    - id: approvedBy
      type: uuid
      required: true
      description: Records which approver accepted the request.
    - id: decisionNotes
      type: text
      required: false
      description: Optional implementation notes that provide extra approval context.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/reject-request.command.yaml`,
    source: `kind: command
type: rejectRequest
target: ApprovalRequest
description: Reject the request and require a rationale so future readers can understand the modeled branch.
payload:
  fields:
    - id: requestId
      type: uuid
      required: true
      description: Identifies the approval request being rejected.
    - id: rejectedBy
      type: uuid
      required: true
      description: Records which approver rejected the request.
    - id: decisionNotes
      type: text
      required: true
      description: Captures the reason the request could not proceed.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/approval-request-submitted.event.yaml`,
    source: `kind: event
type: ApprovalRequestSubmitted
source: ApprovalRequest
description: The request has left draft and is now waiting for an approver to make the next decision.
payload:
  fields:
    - id: requestId
      type: uuid
      required: true
      description: Identifies the approval request that is now under review.
    - id: requestTitle
      type: text
      required: true
      description: Repeats the request title so the review stage keeps its business context.
    - id: requestedBy
      type: uuid
      required: true
      description: Carries forward who submitted the request.
    - id: approverId
      type: uuid
      required: true
      description: Identifies the approver expected to make the decision.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/approval-request-approved.event.yaml`,
    source: `kind: event
type: ApprovalRequestApproved
source: ApprovalRequest
description: The approver accepted the request, so the workflow can close on its approved outcome.
payload:
  fields:
    - id: requestId
      type: uuid
      required: true
      description: Identifies the approval request that was approved.
    - id: approvedBy
      type: uuid
      required: true
      description: Records the approver who made the positive decision.
    - id: decisionNotes
      type: text
      required: false
      description: Optional notes that explain implementation guidance after approval.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/approval-request-rejected.event.yaml`,
    source: `kind: event
type: ApprovalRequestRejected
source: ApprovalRequest
description: The approver rejected the request, so the workflow closes on its rejected outcome.
payload:
  fields:
    - id: requestId
      type: uuid
      required: true
      description: Identifies the approval request that was rejected.
    - id: rejectedBy
      type: uuid
      required: true
      description: Records the approver who rejected the request.
    - id: decisionNotes
      type: text
      required: true
      description: Preserves the rationale for the rejection path.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/approval-request.aggregate.yaml`,
    source: `kind: aggregate
objectId: ApprovalRequest
initial: draft
states:
  draft:
    on:
      submitApprovalRequest:
        target: submitted
        emit:
          type: ApprovalRequestSubmitted
          payloadFrom:
            requestId: $command.requestId
            requestTitle: $command.requestTitle
            requestedBy: $command.requestedBy
            approverId: $command.approverId
  submitted:
    on:
      approveRequest:
        target: approved
        emit:
          type: ApprovalRequestApproved
          payloadFrom:
            requestId: $command.requestId
            approvedBy: $command.approvedBy
            decisionNotes: $command.decisionNotes
      rejectRequest:
        target: rejected
        emit:
          type: ApprovalRequestRejected
          payloadFrom:
            requestId: $command.requestId
            rejectedBy: $command.rejectedBy
            decisionNotes: $command.decisionNotes
  approved: {}
  rejected: {}
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/processes/approval-request-workflow.process.yaml`,
    source: `kind: process
id: approvalRequestWorkflow
title: Approval Request Workflow
uses:
  aggregates:
    approval: ApprovalRequest
initialStage: draftingRequest
stages:
  draftingRequest:
    title: Drafting request
    aggregate: approval
    state: draft
    advancesOn:
      ApprovalRequestSubmitted: awaitingDecision
  awaitingDecision:
    title: Awaiting approval decision
    aggregate: approval
    state: submitted
    advancesOn:
      ApprovalRequestApproved: closedApproved
      ApprovalRequestRejected: closedRejected
  closedApproved:
    title: Request approved
    final: true
    outcome: requestApproved
  closedRejected:
    title: Request rejected
    final: true
    outcome: requestRejected
`
  }
] as const;

const SCAFFOLD_RELATIVE_PATHS = [
  ...DEFAULT_TEMPLATE_FILES.map((file) => file.relativePath),
  ...LEGACY_SCAFFOLD_RELATIVE_PATHS
];

const CANONICAL_SUBDIRECTORIES = [
  "objects",
  "commands",
  "events",
  "aggregates",
  "processes",
  "vocabulary"
] as const;

export interface InitDddSpecOptions {
  cwd?: string;
}

export async function initDddSpec(
  options: InitDddSpecOptions = {}
): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const entryPath = resolve(cwd, ZERO_CONFIG_ENTRY_PATH);

  await assertNoExistingScaffold(cwd);
  await createCanonicalDirectories(cwd);

  let gitignoreStatus: "created" | "updated" | "unchanged";

  try {
    for (const file of DEFAULT_TEMPLATE_FILES) {
      await writeFile(resolve(cwd, file.relativePath), file.source, "utf8");
    }

    await validateGeneratedSkeleton(entryPath);
    gitignoreStatus = await ensureGitignoreEntry(cwd);
  } catch (error) {
    await cleanupScaffoldFiles(cwd);
    throw error;
  }

  logArtifact("created canonical entry", entryPath);
  logInfo(
    `created teaching approval workflow files under ${resolve(cwd, ZERO_CONFIG_CANONICAL_DIR)}`
  );

  if (gitignoreStatus === "created") {
    logArtifact("created .gitignore", resolve(cwd, ".gitignore"));
    return;
  }

  if (gitignoreStatus === "updated") {
    logInfo("updated .gitignore to ignore .ddd-spec/");
    return;
  }

  logInfo(".gitignore already ignores .ddd-spec/");
}

async function assertNoExistingScaffold(cwd: string): Promise<void> {
  const existingFile = await findExistingScaffoldFile(cwd);
  const entryPath = resolve(cwd, ZERO_CONFIG_ENTRY_PATH);

  if (!existingFile) {
    return;
  }

  if (existingFile === entryPath) {
    throw new Error(
      `Refusing to overwrite existing canonical entry at ${existingFile}.`
    );
  }

  throw new Error(
    `Refusing to overwrite existing scaffold file at ${existingFile}. Remove it before running \`ddd-spec init\` again.`
  );
}

async function findExistingScaffoldFile(cwd: string): Promise<string | undefined> {
  for (const relativePath of SCAFFOLD_RELATIVE_PATHS) {
    const absolutePath = resolve(cwd, relativePath);

    if (await pathExists(absolutePath)) {
      return absolutePath;
    }
  }

  return undefined;
}

async function createCanonicalDirectories(cwd: string): Promise<void> {
  await mkdir(resolve(cwd, ZERO_CONFIG_CANONICAL_DIR), { recursive: true });

  for (const directory of CANONICAL_SUBDIRECTORIES) {
    await mkdir(resolve(cwd, ZERO_CONFIG_CANONICAL_DIR, directory), {
      recursive: true
    });
  }
}

async function validateGeneratedSkeleton(entryPath: string): Promise<void> {
  const spec = await loadBusinessSpec({
    entryPath,
    validateSemantics: false
  });

  await validateBusinessSpecSchema(spec, {
    schemaPath: DEFAULT_SCHEMA_PATH
  });
  validateBusinessSpecSemantics(spec);
}

async function ensureGitignoreEntry(
  cwd: string
): Promise<"created" | "updated" | "unchanged"> {
  const gitignorePath = resolve(cwd, ".gitignore");
  const exists = await pathExists(gitignorePath);

  if (!exists) {
    await writeFile(gitignorePath, `${GITIGNORE_ENTRY}\n`, "utf8");
    return "created";
  }

  const currentSource = await readFile(gitignorePath, "utf8");
  const lines = currentSource.split(/\r?\n/);

  if (lines.some((line) => EXISTING_GITIGNORE_MATCHES.has(line.trim()))) {
    return "unchanged";
  }

  if (currentSource.length === 0) {
    await writeFile(gitignorePath, `${GITIGNORE_ENTRY}\n`, "utf8");
    return "updated";
  }

  const nextSource = currentSource.endsWith("\n")
    ? `${currentSource}${GITIGNORE_ENTRY}\n`
    : `${currentSource}\n${GITIGNORE_ENTRY}\n`;

  await writeFile(gitignorePath, nextSource, "utf8");
  return "updated";
}

async function cleanupScaffoldFiles(cwd: string): Promise<void> {
  for (const file of DEFAULT_TEMPLATE_FILES) {
    await rm(resolve(cwd, file.relativePath), {
      force: true
    });
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
