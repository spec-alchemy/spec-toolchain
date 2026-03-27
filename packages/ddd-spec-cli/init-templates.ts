import { dirname } from "node:path";
import { ZERO_CONFIG_ENTRY_PATH } from "./config.js";

export const ZERO_CONFIG_CANONICAL_DIR = "ddd-spec/canonical";
export const DEFAULT_INIT_TEMPLATE_ID = "default";

interface InitTemplateFile {
  relativePath: string;
  source: string;
}

export interface InitTemplateDefinition {
  id: string;
  label: string;
  description: string;
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
    label: "teaching approval workflow",
    description: "Recommended first-time scaffold with a teaching-oriented approval workflow.",
    files: [
      {
        relativePath: ZERO_CONFIG_ENTRY_PATH,
        source: `version: 2
id: approval-workflow
title: Approval Request Workflow
summary: Teaching template showing how a request moves from draft to review, then closes as approved or rejected.
vocabulary:
  viewerDetails: ./vocabulary/viewer-detail-semantics.yaml
domain:
  objects:
    - ./objects/approval-request.object.yaml
    - ./objects/approval-request-status.object.yaml
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
      ...SHARED_TEMPLATE_FILES,
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/approval-request.object.yaml`,
        source: `kind: object
id: ApprovalRequest
title: Approval Request
role: entity
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
    ref:
      kind: enum
      objectId: ApprovalRequestStatus
    description: Lifecycle field mirrored by the aggregate states and the workflow stages.
`
      },
      {
        relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/approval-request-status.object.yaml`,
        source: `kind: object
id: ApprovalRequestStatus
title: Approval Request Status
role: enum
values:
  - draft
  - submitted
  - approved
  - rejected
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
    ]
  },
  {
    id: "minimal",
    label: "minimal starter scaffold",
    description: "Smallest valid scaffold for advanced users who want to shape the model themselves.",
    files: [
      {
        relativePath: ZERO_CONFIG_ENTRY_PATH,
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
    files: [
      {
        relativePath: ZERO_CONFIG_ENTRY_PATH,
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
