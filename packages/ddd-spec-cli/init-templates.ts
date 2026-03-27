import { dirname } from "node:path";
import { LEGACY_ZERO_CONFIG_ENTRY_PATH, ZERO_CONFIG_ENTRY_PATH } from "./config.js";

export const ZERO_CONFIG_CANONICAL_DIR = "ddd-spec/canonical";
export const DEFAULT_ZERO_CONFIG_CANONICAL_DIR = "ddd-spec/canonical-vnext";
export const DEFAULT_INIT_TEMPLATE_ID = "default";

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

const VIEWER_DETAIL_SEMANTICS_SOURCE = `context.id:
  label: Context
  description: The bounded context currently shown as the top-level business ownership boundary.
context.owned_aggregates:
  label: Owned aggregates
  description: The aggregates currently modeled inside the context boundary.
context.scenarios:
  label: Scenarios
  description: The scenarios currently taught as the default business stories for this context.
scenario.id:
  label: Scenario
  description: The end-to-end business scenario that anchors the reader's default story path.
scenario.initial_step:
  label: Initial step
  description: The first step where the scenario begins before any follow-up messages move it forward.
scenario.final_steps:
  label: Final steps
  description: The valid endings of the scenario after the required business work is complete.
scenario.related_aggregates:
  label: Related aggregates
  description: The aggregates that the scenario touches while its steps progress.
step.id:
  label: Step
  description: A single business step inside the scenario story.
step.final:
  label: Final
  description: Marks whether the step is a terminal business outcome instead of an active working step.
step.bound_aggregate:
  label: Bound aggregate
  description: The aggregate that the step currently works against when lifecycle state matters.
step.bound_state:
  label: Bound state
  description: The lifecycle state that contextualizes the current step.
step.outcome:
  label: Outcome
  description: A short business result that explains how the scenario ended when it reached a final step.
message.kind:
  label: Message kind
  description: The message category, such as command or event.
message.type:
  label: Message
  description: The business message type currently being discussed or drawn in the view.
event.observed_by_step:
  label: Observed by step
  description: Whether a scenario step explicitly listens to this event as the signal to continue.
event.advances_to_step:
  label: Advances to step
  description: The next step reached after the event is observed.
process.id:
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
aggregate.root_object:
  label: Root object
  description: The aggregate root object that defines the boundary and owns the lifecycle.
aggregate.owned_objects:
  label: Owned objects
  description: The value objects or nested structure objects that belong inside the aggregate boundary by composition.
aggregate.shared_types:
  label: Shared types
  description: The shared enum or type objects that the aggregate references without owning them.
aggregate.external_dependencies:
  label: External dependencies
  description: The objects outside the aggregate boundary that this aggregate explicitly references.
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
  label: Relation Type
  description: The relationship type, such as state transition, stage binding, process advance, association, composition, or reference.
object.id:
  label: Object
  description: The identifier of the structural object node shown in the domain structure view.
object.role:
  label: Role
  description: The canonical object role shown for the object node, such as entity, value-object, or enum.
object.fields:
  label: Fields
  description: The object fields, including their types, requirements, and optional semantic refs.
object.relations:
  label: Explicit Relations
  description: The explicit relations declared directly on the object when no concrete field carries them.
object.referenced_by:
  label: Referenced by
  description: The fields or relations that point at the current object from elsewhere in the model.
enum.values:
  label: Values
  description: The allowed values declared by an enum object.
domain.shared_types:
  label: Shared types
  description: The shared enum or cross-aggregate type objects collected into the shared-types lane.
domain.shared_type_consumers:
  label: Used by
  description: The objects and fields that currently consume the shared types in the shared-types lane.
relation.cardinality:
  label: Cardinality
  description: The quantity constraint carried by the relationship, such as 1, 0..1, 0..n, or 1..n.
relation.description:
  label: Description
  description: The extra business explanation attached to the relationship.
relation.field:
  label: Field
  description: The field that carries the relationship when the structure is modeled through a field.
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
context.owners:
  label: Owners
  description: The teams, roles, or groups that own the current bounded context.
context.responsibilities:
  label: Responsibilities
  description: The explicit business responsibilities carried by the current bounded context.
context.related_actors:
  label: Actors
  description: The actors that participate in steps inside the current context.
context.related_systems:
  label: Systems
  description: The systems that the current context collaborates with through dependencies or messages.
context.relationships:
  label: Relationships
  description: The explicit external relationships declared by the current context.
actor.type:
  label: Actor type
  description: The participant type for the current actor, such as person, role, or team.
actor.contexts:
  label: Contexts
  description: The contexts where the current actor participates in scenario steps.
actor.scenarios:
  label: Scenarios
  description: The scenarios where the current actor participates.
actor.scenario_steps:
  label: Scenario steps
  description: The concrete scenario steps where the current actor appears.
system.boundary:
  label: Boundary
  description: Whether the current system is modeled as an internal capability or an external dependency.
system.capabilities:
  label: Capabilities
  description: The explicit capabilities exposed by the current system.
system.contexts:
  label: Contexts
  description: The contexts that depend on or collaborate with the current system.
system.dependencies:
  label: Dependencies
  description: The scenario, message, or policy references that point at the current system.
scenario.goal:
  label: Goal
  description: The business goal that the current scenario is trying to achieve.
scenario.owner_context:
  label: Owner context
  description: The bounded context that owns the primary story of the current scenario.
scenario.participating_contexts:
  label: Participating contexts
  description: The contexts touched by the current scenario from start to finish.
scenario.actors:
  label: Actors
  description: The actors that appear in the current scenario.
scenario.systems:
  label: Systems
  description: The systems that appear in the current scenario.
step.context:
  label: Context
  description: The bounded context where the current scenario step takes place.
step.actor:
  label: Actor
  description: The actor who initiates or leads the current step.
step.system:
  label: System
  description: The system that the current step directly touches.
step.entry:
  label: Entry
  description: Whether the current step is the entry point of the scenario.
step.incoming_messages:
  label: Incoming messages
  description: The messages that the current step receives or observes.
step.outgoing_messages:
  label: Outgoing messages
  description: The messages that the current step emits, requests, or triggers.
message.channel:
  label: Channel
  description: Whether the current message is expected to travel synchronously or asynchronously.
message.endpoints:
  label: Endpoints
  description: The current message sources, targets, and their owning contexts.
message.crosses_context_boundary:
  label: Crosses context boundary
  description: Whether the current message crosses more than one bounded context.
message.step_links:
  label: Scenario links
  description: The scenario steps that reference the current message as incoming or outgoing.
message.payload_fields:
  label: Payload fields
  description: The payload contract fields carried by the current message.
aggregate.context:
  label: Context
  description: The bounded context that owns the current aggregate lifecycle.
aggregate.accepted_messages:
  label: Accepted messages
  description: The messages that can trigger lifecycle transitions for the current aggregate.
aggregate.emitted_messages:
  label: Emitted messages
  description: The messages emitted by the current aggregate during lifecycle transitions.
aggregate.reachable_states:
  label: Reachable states
  description: The lifecycle states that can be reached from the initial state.
aggregate.unreachable_states:
  label: Unreachable states
  description: The lifecycle states that are currently unreachable from the initial state.
aggregate.state.outgoing_messages:
  label: Outgoing messages
  description: The messages emitted by transitions that leave the current lifecycle state.
transition.trigger_message:
  label: Trigger message
  description: The message that causes the current lifecycle transition.
transition.emitted_messages:
  label: Emitted messages
  description: The follow-up messages emitted by the current lifecycle transition.
policy.id:
  label: Policy
  description: The identifier for the current policy or saga.
policy.context:
  label: Context
  description: The bounded context that owns or declares the current policy.
policy.trigger_messages:
  label: Trigger messages
  description: The messages that trigger the current policy.
policy.emitted_messages:
  label: Emitted messages
  description: The messages emitted after the current policy reacts.
policy.target_systems:
  label: Target systems
  description: The external or internal systems coordinated by the current policy.
policy.related_contexts:
  label: Related contexts
  description: The bounded contexts touched by the current policy.
policy.coordinates:
  label: Coordinates
  description: The resources explicitly coordinated by the current policy.
`;

const SHARED_TEMPLATE_FILES = [
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/vocabulary/viewer-detail-semantics.yaml`,
    source: VIEWER_DETAIL_SEMANTICS_SOURCE
  }
] as const;

const INIT_TEMPLATE_DEFINITIONS = [
  {
    id: DEFAULT_INIT_TEMPLATE_ID,
    label: "vNext approval starter",
    description:
      "Recommended first-time scaffold with one context, one scenario, one message flow, and one lifecycle.",
    entryPath: ZERO_CONFIG_ENTRY_PATH,
    scaffoldDir: DEFAULT_ZERO_CONFIG_CANONICAL_DIR,
    files: [
      {
        relativePath: ZERO_CONFIG_ENTRY_PATH,
        source: `version: 3
id: approval-flow-vnext
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/contexts/approvals.context.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/actors/requester.actor.yaml`,
        source: `kind: actor
id: requester
title: Requester
summary: Starts an approval request and waits for the final decision.
actorType: role
`
      },
      {
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/actors/approver.actor.yaml`,
        source: `kind: actor
id: approver
title: Approver
summary: Reviews the submitted request and records the business decision.
actorType: role
`
      },
      {
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/systems/notification-hub.system.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/scenarios/approval-request-flow.scenario.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/messages/submit-approval-request.message.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/messages/approval-request-submitted.message.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/messages/approve-request.message.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/messages/approval-request-approved.message.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/messages/send-approval-notification.message.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/aggregates/approval-request.aggregate.yaml`,
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
        relativePath: `${DEFAULT_ZERO_CONFIG_CANONICAL_DIR}/policies/notify-requester-after-approval.policy.yaml`,
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
  },
  {
    id: "minimal",
    label: "minimal starter scaffold",
    description: "Smallest valid scaffold for advanced users who want to shape the model themselves.",
    entryPath: LEGACY_ZERO_CONFIG_ENTRY_PATH,
    scaffoldDir: ZERO_CONFIG_CANONICAL_DIR,
    files: [
      {
        relativePath: LEGACY_ZERO_CONFIG_ENTRY_PATH,
        source: `version: 2
id: minimal-domain
title: Minimal Domain Skeleton
summary: Minimal template with one object, one command, one event, one aggregate, and one process.
vocabulary:
  viewerDetails: ./vocabulary/viewer-detail-semantics.yaml
domain:
  objects:
    - ./objects/example-record.object.yaml
    - ./objects/example-record-status.object.yaml
  commands:
    - ./commands/activate-example-record.command.yaml
  events:
    - ./events/example-record-activated.event.yaml
  aggregates:
    - ./aggregates/example-record.aggregate.yaml
  processes:
    - ./processes/example-record.process.yaml
`
      },
      ...SHARED_TEMPLATE_FILES,
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/example-record.object.yaml`,
        source: `kind: object
id: ExampleRecord
title: Example Record
role: entity
lifecycleField: status
lifecycle:
  - draft
  - active
fields:
  - id: recordId
    type: uuid
    required: true
    description: Stable identifier for the smallest valid starting point.
  - id: status
    type: ExampleRecordStatus
    required: true
    ref:
      kind: enum
      objectId: ExampleRecordStatus
    description: Lifecycle field used by the minimal aggregate and process.
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/example-record-status.object.yaml`,
        source: `kind: object
id: ExampleRecordStatus
title: Example Record Status
role: enum
values:
  - draft
  - active
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/activate-example-record.command.yaml`,
        source: `kind: command
type: activateExampleRecord
target: ExampleRecord
description: Move the record from draft to active with the smallest useful transition.
payload:
  fields:
    - id: recordId
      type: uuid
      required: true
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/example-record-activated.event.yaml`,
        source: `kind: event
type: ExampleRecordActivated
source: ExampleRecord
description: The record has moved from draft to active.
payload:
  fields:
    - id: recordId
      type: uuid
      required: true
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/example-record.aggregate.yaml`,
        source: `kind: aggregate
objectId: ExampleRecord
initial: draft
states:
  draft:
    on:
      activateExampleRecord:
        target: active
        emit:
          type: ExampleRecordActivated
          payloadFrom:
            recordId: $command.recordId
  active: {}
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/processes/example-record.process.yaml`,
        source: `kind: process
id: exampleRecordLifecycle
title: Example Record Lifecycle
uses:
  aggregates:
    record: ExampleRecord
initialStage: draftingRecord
stages:
  draftingRecord:
    title: Drafting record
    aggregate: record
    state: draft
    advancesOn:
      ExampleRecordActivated: activeRecord
  activeRecord:
    title: Record active
    final: true
    outcome: recordActive
`
      }
    ]
  },
  {
    id: "order-payment",
    label: "order-payment example scaffold",
    description: "Example-style scaffold with separate order and payment aggregates.",
    entryPath: LEGACY_ZERO_CONFIG_ENTRY_PATH,
    scaffoldDir: ZERO_CONFIG_CANONICAL_DIR,
    files: [
      {
        relativePath: LEGACY_ZERO_CONFIG_ENTRY_PATH,
        source: `version: 2
id: order-payment
title: Order Submission and Payment Workflow
summary: Example-style template showing an order submission handing off to payment confirmation before the workflow closes.
vocabulary:
  viewerDetails: ./vocabulary/viewer-detail-semantics.yaml
domain:
  objects:
    - ./objects/order.object.yaml
    - ./objects/payment.object.yaml
    - ./objects/payment-settlement.object.yaml
    - ./objects/order-status.object.yaml
    - ./objects/payment-status.object.yaml
  commands:
    - ./commands/submit-order.command.yaml
    - ./commands/confirm-payment.command.yaml
  events:
    - ./events/order-submitted.event.yaml
    - ./events/payment-confirmed.event.yaml
  aggregates:
    - ./aggregates/order.aggregate.yaml
    - ./aggregates/payment.aggregate.yaml
  processes:
    - ./processes/order-payment.process.yaml
`
      },
      ...SHARED_TEMPLATE_FILES,
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/order.object.yaml`,
        source: `kind: object
id: Order
title: Order
role: entity
lifecycleField: status
lifecycle:
  - draft
  - submitted
fields:
  - id: orderId
    type: uuid
    required: true
    description: Stable identifier for the order request.
  - id: customerId
    type: uuid
    required: true
    description: Identifies the customer who submitted the order.
  - id: totalAmount
    type: decimal
    required: true
    description: Total amount the order expects to collect.
  - id: status
    type: OrderStatus
    required: true
    ref:
      kind: enum
      objectId: OrderStatus
    description: Lifecycle field mirrored by the order aggregate states.
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/payment.object.yaml`,
        source: `kind: object
id: Payment
title: Payment
role: entity
lifecycleField: paymentStatus
lifecycle:
  - pending
  - confirmed
fields:
  - id: paymentId
    type: uuid
    required: true
    description: Stable identifier for the payment record.
  - id: orderId
    type: uuid
    required: true
    ref:
      kind: reference
      objectId: Order
    description: Connects the payment back to the order it settles.
  - id: settlement
    type: PaymentSettlement
    required: true
    ref:
      kind: composition
      objectId: PaymentSettlement
    description: Captures the settlement detail owned by the payment aggregate.
  - id: paidAmount
    type: decimal
    required: true
    description: Amount captured when the payment is confirmed.
  - id: paymentStatus
    type: PaymentStatus
    required: true
    ref:
      kind: enum
      objectId: PaymentStatus
    description: Lifecycle field mirrored by the payment aggregate states.
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/payment-settlement.object.yaml`,
        source: `kind: object
id: PaymentSettlement
title: Payment Settlement
role: value-object
fields:
  - id: method
    type: text
    required: true
    description: Payment channel or method captured with the confirmed settlement.
  - id: confirmedAt
    type: datetime
    required: true
    description: Timestamp recorded when the settlement is considered complete.
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/order-status.object.yaml`,
        source: `kind: object
id: OrderStatus
title: Order Status
role: enum
values:
  - draft
  - submitted
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/payment-status.object.yaml`,
        source: `kind: object
id: PaymentStatus
title: Payment Status
role: enum
values:
  - pending
  - confirmed
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/submit-order.command.yaml`,
        source: `kind: command
type: submitOrder
target: Order
description: Submit an order and move it into the stage that waits for payment confirmation.
payload:
  fields:
    - id: orderId
      type: uuid
      required: true
    - id: customerId
      type: uuid
      required: true
    - id: totalAmount
      type: decimal
      required: true
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/confirm-payment.command.yaml`,
        source: `kind: command
type: confirmPayment
target: Payment
description: Confirm that payment has been captured and close the payment stage.
payload:
  fields:
    - id: paymentId
      type: uuid
      required: true
    - id: orderId
      type: uuid
      required: true
    - id: paidAmount
      type: decimal
      required: true
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/order-submitted.event.yaml`,
        source: `kind: event
type: OrderSubmitted
source: Order
description: The order aggregate has moved from draft into submitted.
payload:
  fields:
    - id: orderId
      type: uuid
      required: true
    - id: customerId
      type: uuid
      required: true
    - id: totalAmount
      type: decimal
      required: true
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/payment-confirmed.event.yaml`,
        source: `kind: event
type: PaymentConfirmed
source: Payment
description: The payment aggregate has moved from pending into confirmed.
payload:
  fields:
    - id: paymentId
      type: uuid
      required: true
    - id: orderId
      type: uuid
      required: true
    - id: paidAmount
      type: decimal
      required: true
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/order.aggregate.yaml`,
        source: `kind: aggregate
objectId: Order
initial: draft
states:
  draft:
    on:
      submitOrder:
        target: submitted
        emit:
          type: OrderSubmitted
          payloadFrom:
            orderId: $command.orderId
            customerId: $command.customerId
            totalAmount: $command.totalAmount
  submitted: {}
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/payment.aggregate.yaml`,
        source: `kind: aggregate
objectId: Payment
initial: pending
states:
  pending:
    on:
      confirmPayment:
        target: confirmed
        emit:
          type: PaymentConfirmed
          payloadFrom:
            paymentId: $command.paymentId
            orderId: $command.orderId
            paidAmount: $command.paidAmount
  confirmed: {}
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/processes/order-payment.process.yaml`,
        source: `kind: process
id: orderPaymentProcess
title: Order Submission and Payment Workflow
uses:
  aggregates:
    order: Order
    payment: Payment
initialStage: awaitingOrderSubmission
stages:
  awaitingOrderSubmission:
    title: Awaiting order submission
    aggregate: order
    state: draft
    advancesOn:
      OrderSubmitted: awaitingPaymentConfirmation
  awaitingPaymentConfirmation:
    title: Awaiting payment confirmation
    aggregate: payment
    state: pending
    advancesOn:
      PaymentConfirmed: closedOrderPaid
  closedOrderPaid:
    title: Order paid
    final: true
    outcome: orderPaid
`
      }
    ]
  }
] as const satisfies readonly InitTemplateDefinition[];

const INIT_TEMPLATE_DEFINITION_BY_ID = new Map<string, InitTemplateDefinition>(
  INIT_TEMPLATE_DEFINITIONS.map((template) => [template.id, template])
);

export function listInitTemplates(): readonly InitTemplateDefinition[] {
  return INIT_TEMPLATE_DEFINITIONS;
}

export function getSupportedInitTemplateIds(): readonly string[] {
  return INIT_TEMPLATE_DEFINITIONS.map((template) => template.id);
}

export function getInitTemplate(templateId: string = DEFAULT_INIT_TEMPLATE_ID): InitTemplateDefinition {
  const template = INIT_TEMPLATE_DEFINITION_BY_ID.get(templateId);

  if (template) {
    return template;
  }

  throw new Error(
    `Unknown init template: ${templateId}. Supported templates: ${getSupportedInitTemplateIds().join(", ")}.`
  );
}

export function getInitScaffoldRelativePaths(): readonly string[] {
  return [...new Set(INIT_TEMPLATE_DEFINITIONS.flatMap((template) => template.files.map((file) => file.relativePath)))];
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
