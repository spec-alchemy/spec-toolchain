import { dirname } from "node:path";
import { ZERO_CONFIG_ENTRY_PATH } from "./config.js";

export const DEFAULT_ZERO_CONFIG_MODEL_DIR = "domain-model";

interface InitTemplateFile {
  relativePath: string;
  source: string;
}

export interface InitTemplateDefinition {
  id: string;
  label: string;
  description: string;
  entryPath: string;
  scaffoldDir: string;
  files: readonly InitTemplateFile[];
}

const DEFAULT_INIT_TEMPLATE: InitTemplateDefinition = {
  id: "default",
  label: "domain model starter",
  description:
    "Recommended first-time scaffold with one context, one scenario, one message flow, and one lifecycle.",
  entryPath: ZERO_CONFIG_ENTRY_PATH,
  scaffoldDir: DEFAULT_ZERO_CONFIG_MODEL_DIR,
  files: [
    {
      relativePath: ZERO_CONFIG_ENTRY_PATH,
      source: `version: 3
id: approval-flow
title: Approval Flow Starter
summary: Starter model showing how one bounded context, one scenario, one message flow, and one lifecycle fit together.
model:
  contexts: ./contexts
  actors: ./actors
  systems: ./systems
  scenarios: ./scenarios
  messages: ./messages
  aggregates: ./aggregates
  policies: ./policies
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/contexts/approvals.context.yaml`,
      source: `kind: context
id: approvals
title: Approvals
summary: Owns the approval request lifecycle and the core decision flow.
owners:
  - approvals-team
responsibilities:
  - Receive approval requests
  - Track review state
  - Publish approval outcomes
relationships:
  - id: notify-requester
    kind: notifies
    target:
      kind: system
      id: notification-hub
    description: Uses the notification hub to deliver requester-facing messages after the approval finishes.
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/actors/requester.actor.yaml`,
      source: `kind: actor
id: requester
title: Requester
summary: Starts an approval request and waits for the final decision.
actorType: role
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/actors/approver.actor.yaml`,
      source: `kind: actor
id: approver
title: Approver
summary: Reviews the submitted request and records the business decision.
actorType: role
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/systems/notification-hub.system.yaml`,
      source: `kind: system
id: notification-hub
title: Notification Hub
summary: External system that sends the final approval update back to the requester.
boundary: external
capabilities:
  - Send requester notifications
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/scenarios/approval-request-flow.scenario.yaml`,
      source: `kind: scenario
id: approval-request-flow
title: Approval Request Flow
summary: Core business story from submission through approval and requester notification.
goal: Get an approval request from draft to approved and notify the requester.
ownerContext: approvals
steps:
  - id: draft-request
    title: Draft request
    context: approvals
    actor: requester
    outgoingMessages:
      - submit-approval-request
    next:
      - awaiting-review
  - id: awaiting-review
    title: Review request
    context: approvals
    actor: approver
    incomingMessages:
      - approval-request-submitted
    outgoingMessages:
      - approve-request
    next:
      - request-approved
  - id: request-approved
    title: Request approved
    context: approvals
    incomingMessages:
      - approval-request-approved
    final: true
    outcome: request-approved
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/messages/submit-approval-request.message.yaml`,
      source: `kind: message
id: submit-approval-request
title: Submit Approval Request
summary: Command asking the approvals context to move a drafted request into review.
messageKind: command
channel: sync
producers:
  - kind: actor
    id: requester
consumers:
  - kind: aggregate
    id: approval-request
payload:
  - id: request-id
    type: uuid
    required: true
  - id: request-title
    type: text
    required: true
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/messages/approval-request-submitted.message.yaml`,
      source: `kind: message
id: approval-request-submitted
title: Approval Request Submitted
summary: Event recording that the request left draft and is now awaiting review.
messageKind: event
channel: async
producers:
  - kind: aggregate
    id: approval-request
consumers:
  - kind: scenario
    id: approval-request-flow
payload:
  - id: request-id
    type: uuid
    required: true
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/messages/approve-request.message.yaml`,
      source: `kind: message
id: approve-request
title: Approve Request
summary: Command asking the aggregate to close the request with an approved decision.
messageKind: command
channel: sync
producers:
  - kind: actor
    id: approver
consumers:
  - kind: aggregate
    id: approval-request
payload:
  - id: request-id
    type: uuid
    required: true
  - id: approver-id
    type: uuid
    required: true
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/messages/approval-request-approved.message.yaml`,
      source: `kind: message
id: approval-request-approved
title: Approval Request Approved
summary: Event recording that the approval decision has completed successfully.
messageKind: event
channel: async
producers:
  - kind: aggregate
    id: approval-request
consumers:
  - kind: scenario
    id: approval-request-flow
  - kind: policy
    id: notify-requester-after-approval
payload:
  - id: request-id
    type: uuid
    required: true
  - id: approver-id
    type: uuid
    required: true
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/messages/send-approval-notification.message.yaml`,
      source: `kind: message
id: send-approval-notification
title: Send Approval Notification
summary: Command asking the external notification hub to notify the requester after approval.
messageKind: command
channel: async
producers:
  - kind: policy
    id: notify-requester-after-approval
consumers:
  - kind: system
    id: notification-hub
payload:
  - id: request-id
    type: uuid
    required: true
  - id: requester-id
    type: uuid
    required: true
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/aggregates/approval-request.aggregate.yaml`,
      source: `kind: aggregate
id: approval-request
title: Approval Request
summary: Controls the approval lifecycle from draft through submitted to approved.
context: approvals
lifecycleComplexity: true
states:
  - draft
  - submitted
  - approved
initialState: draft
transitions:
  - id: submit-request
    from: draft
    to: submitted
    onMessage: submit-approval-request
    emits:
      - approval-request-submitted
  - id: approve-request
    from: submitted
    to: approved
    onMessage: approve-request
    emits:
      - approval-request-approved
`
    },
    {
      relativePath: `${DEFAULT_ZERO_CONFIG_MODEL_DIR}/policies/notify-requester-after-approval.policy.yaml`,
      source: `kind: policy
id: notify-requester-after-approval
title: Notify Requester After Approval
summary: Sends a requester-facing notification after the approval outcome is finalized.
context: approvals
triggerMessages:
  - approval-request-approved
emittedMessages:
  - send-approval-notification
targetSystems:
  - notification-hub
coordinates:
  - kind: aggregate
    id: approval-request
  - kind: system
    id: notification-hub
`
    }
  ]
};

export function getInitTemplate(): InitTemplateDefinition {
  return DEFAULT_INIT_TEMPLATE;
}

export function getInitScaffoldRelativePaths(): readonly string[] {
  return DEFAULT_INIT_TEMPLATE.files.map((file) => file.relativePath);
}

export function getInitTemplateDirectoryPaths(
  template: InitTemplateDefinition
): readonly string[] {
  return [
    ...new Set(
      template.files
        .map((file) => dirname(file.relativePath))
        .filter((relativePath) => relativePath !== ".")
    )
  ];
}
