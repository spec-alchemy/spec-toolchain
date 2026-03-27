import type {
  VnextActorParticipant,
  VnextAggregateLifecycle,
  VnextBusinessSpec,
  VnextBusinessSpecAnalysis,
  VnextContextBoundary,
  VnextLifecycleTransition,
  VnextMessageFlow,
  VnextMessageKind,
  VnextMessageStepLink,
  VnextPolicyCoordination,
  VnextScenarioSequence,
  VnextScenarioStep,
  VnextSystemParticipant
} from "../ddd-spec-core/index.js";
import { projectVnextLifecycle } from "../ddd-spec-core/index.js";
import type {
  BusinessViewerSpec,
  ViewerDetailItem,
  ViewerDetailValue,
  ViewerNodeSpec,
  ViewerViewSpec
} from "../ddd-spec-viewer-contract/index.js";
import { BUSINESS_VIEWER_SPEC_VERSION } from "../ddd-spec-viewer-contract/index.js";

const DIMENSIONS = {
  contextGroup: { width: 360, minHeight: 240, charsPerLine: 32, minHeaderHeight: 120 },
  scenarioGroup: { width: 320, minHeight: 220, charsPerLine: 28, minHeaderHeight: 116 },
  aggregateGroup: { width: 280, minHeight: 180, charsPerLine: 24, minHeaderHeight: 112 },
  step: { width: 220, minHeight: 112, charsPerLine: 20 },
  finalStep: { width: 220, minHeight: 100, charsPerLine: 20 },
  message: { width: 228, minHeight: 96, charsPerLine: 19 },
  actor: { width: 208, minHeight: 92, charsPerLine: 18 },
  system: { width: 220, minHeight: 96, charsPerLine: 20 },
  policy: { width: 220, minHeight: 96, charsPerLine: 20 },
  aggregate: { width: 220, minHeight: 96, charsPerLine: 20 },
  lifecycleState: { width: 180, minHeight: 96, charsPerLine: 16 }
} as const;

const VNEXT_VIEWER_DETAIL_SEMANTICS = {
  "context.id": {
    label: "Context",
    description: "当前作为业务所有权边界展示的 bounded context。"
  },
  "context.owners": {
    label: "Owners",
    description: "对当前 context 负业务责任的团队、角色或组织。"
  },
  "context.responsibilities": {
    label: "Responsibilities",
    description: "当前 context 明确承担的业务职责集合。"
  },
  "context.owned_aggregates": {
    label: "Owned aggregates",
    description: "当前 context 边界内部建模的聚合集合。"
  },
  "context.scenarios": {
    label: "Scenarios",
    description: "当前 context 默认教学路径下的业务场景集合。"
  },
  "context.related_actors": {
    label: "Actors",
    description: "会在当前 context 边界内发起或参与步骤的 actor 集合。"
  },
  "context.related_systems": {
    label: "Systems",
    description: "当前 context 会协作、依赖或调用的系统集合。"
  },
  "context.relationships": {
    label: "Relationships",
    description: "当前 context 显式声明的外部协作或依赖关系。"
  },
  "actor.type": {
    label: "Actor type",
    description: "当前 actor 的参与者类型，例如 person、role 或 team。"
  },
  "actor.contexts": {
    label: "Contexts",
    description: "当前 actor 参与过步骤的 context 集合。"
  },
  "actor.scenarios": {
    label: "Scenarios",
    description: "当前 actor 参与过的场景集合。"
  },
  "actor.scenario_steps": {
    label: "Scenario steps",
    description: "当前 actor 在哪些场景步骤中显式参与。"
  },
  "system.boundary": {
    label: "Boundary",
    description: "当前系统属于内部能力还是外部依赖。"
  },
  "system.capabilities": {
    label: "Capabilities",
    description: "当前系统向业务建模显式提供的能力集合。"
  },
  "system.contexts": {
    label: "Contexts",
    description: "当前系统与哪些业务 context 存在依赖或消息协作。"
  },
  "system.dependencies": {
    label: "Dependencies",
    description: "当前系统被哪些 context、message 或 policy 以何种方式引用。"
  },
  "scenario.id": {
    label: "Scenario",
    description: "作为默认阅读主线的端到端业务场景。"
  },
  "scenario.goal": {
    label: "Goal",
    description: "该场景试图达成的业务目标。"
  },
  "scenario.owner_context": {
    label: "Owner context",
    description: "拥有该场景主叙事和业务责任的 context。"
  },
  "scenario.participating_contexts": {
    label: "Participating contexts",
    description: "该场景推进过程中会触达的 context 集合。"
  },
  "scenario.actors": {
    label: "Actors",
    description: "在该场景步骤中出现过的 actor 集合。"
  },
  "scenario.systems": {
    label: "Systems",
    description: "在该场景步骤中出现过的系统集合。"
  },
  "scenario.final_steps": {
    label: "Final steps",
    description: "该场景允许收束到的终局步骤集合。"
  },
  "step.id": {
    label: "Step",
    description: "场景故事中的单个业务步骤。"
  },
  "step.context": {
    label: "Context",
    description: "当前步骤所属的业务 context。"
  },
  "step.actor": {
    label: "Actor",
    description: "当前步骤由哪个 actor 发起或主导。"
  },
  "step.system": {
    label: "System",
    description: "当前步骤直接接触或调用的系统。"
  },
  "step.entry": {
    label: "Entry",
    description: "标记该步骤是否为场景入口。"
  },
  "step.final": {
    label: "Final",
    description: "标记该步骤是否为终局业务结果，而不是继续推进中的工作步骤。"
  },
  "step.incoming_messages": {
    label: "Incoming messages",
    description: "当前步骤会接收或观察的消息集合。"
  },
  "step.outgoing_messages": {
    label: "Outgoing messages",
    description: "当前步骤会发出、触发或请求的消息集合。"
  },
  "step.outcome": {
    label: "Outcome",
    description: "当场景走到终局步骤时，对业务结果的简短说明。"
  },
  "message.kind": {
    label: "Message kind",
    description: "当前消息的类别，例如 command、event 或 query。"
  },
  "message.type": {
    label: "Message",
    description: "当前视图中展示或讨论的业务消息标识。"
  },
  "message.channel": {
    label: "Channel",
    description: "当前消息预期通过 sync 或 async 方式传递。"
  },
  "message.endpoints": {
    label: "Endpoints",
    description: "当前消息的 source、target 以及它们所在的 context。"
  },
  "message.crosses_context_boundary": {
    label: "Crosses context boundary",
    description: "当前消息是否跨越多个业务 context。"
  },
  "message.step_links": {
    label: "Scenario links",
    description: "当前消息与哪些场景步骤存在 incoming 或 outgoing 绑定。"
  },
  "message.payload_fields": {
    label: "Payload fields",
    description: "当前消息契约中的 payload 字段，以及每个字段的语义说明。"
  },
  "aggregate.id": {
    label: "Aggregate",
    description: "当前节点或关系所属的聚合对象。"
  },
  "aggregate.context": {
    label: "Context",
    description: "拥有该 aggregate 生命周期的业务 context。"
  },
  "aggregate.initial_state": {
    label: "Initial state",
    description: "聚合生命周期开始时的默认状态。"
  },
  "aggregate.lifecycle": {
    label: "Lifecycle",
    description: "该聚合定义的全部生命周期状态集合。"
  },
  "aggregate.accepted_messages": {
    label: "Accepted messages",
    description: "驱动该 aggregate 生命周期转移的消息集合。"
  },
  "aggregate.emitted_messages": {
    label: "Emitted messages",
    description: "该 aggregate 在转移过程中会发出的消息集合。"
  },
  "aggregate.reachable_states": {
    label: "Reachable states",
    description: "可从初始状态通过合法转移到达的状态集合。"
  },
  "aggregate.unreachable_states": {
    label: "Unreachable states",
    description: "当前生命周期里尚不可达的状态集合。"
  },
  "aggregate.state.id": {
    label: "State",
    description: "当前聚合所处的生命周期状态。"
  },
  "aggregate.state.reachable": {
    label: "Reachable",
    description: "表示该状态是否能从初始状态通过合法转移到达。"
  },
  "aggregate.state.outgoing_messages": {
    label: "Outgoing messages",
    description: "从当前状态出发可能触发的生命周期转移所发出的消息集合。"
  },
  "transition.trigger_message": {
    label: "Trigger message",
    description: "触发当前生命周期转移的消息。"
  },
  "transition.emitted_messages": {
    label: "Emitted messages",
    description: "当前生命周期转移会额外发出的消息集合。"
  },
  "relation.from": {
    label: "From",
    description: "转移或关系的起点状态、起始步骤或来源节点。"
  },
  "relation.to": {
    label: "To",
    description: "转移或关系的目标状态、目标步骤或去向节点。"
  },
  "policy.id": {
    label: "Policy",
    description: "当前协调策略或 saga 的标识。"
  },
  "policy.context": {
    label: "Context",
    description: "当前 policy 所属或声明的业务 context。"
  },
  "policy.trigger_messages": {
    label: "Trigger messages",
    description: "会触发该 policy 运行的消息集合。"
  },
  "policy.emitted_messages": {
    label: "Emitted messages",
    description: "该 policy 继续向外发出的消息集合。"
  },
  "policy.target_systems": {
    label: "Target systems",
    description: "该 policy 会调用或协调的目标系统。"
  },
  "policy.related_contexts": {
    label: "Related contexts",
    description: "该 policy 触达或协调到的 context 集合。"
  },
  "policy.coordinates": {
    label: "Coordinates",
    description: "该 policy 显式协调的业务资源集合。"
  }
} as const;

type SemanticKey = keyof typeof VNEXT_VIEWER_DETAIL_SEMANTICS;

export function buildVnextViewerSpec(
  spec: VnextBusinessSpec,
  analysis: VnextBusinessSpecAnalysis
): BusinessViewerSpec {
  const views: ViewerViewSpec[] = [
    buildContextMapView(analysis),
    buildScenarioStoryView(analysis),
    buildMessageFlowView(analysis),
    buildLifecycleView(analysis)
  ];

  if (analysis.ir.policyCoordinations.length > 0) {
    views.push(buildPolicySagaView(analysis));
  }

  return {
    viewerVersion: BUSINESS_VIEWER_SPEC_VERSION,
    specId: spec.id,
    title: spec.title,
    summary: spec.summary,
    detailHelp: {
      semantic: Object.fromEntries(
        Object.entries(VNEXT_VIEWER_DETAIL_SEMANTICS).map(([semanticKey, semantic]) => [
          semanticKey,
          semantic.description
        ])
      )
    },
    views
  };
}

function buildContextMapView(
  analysis: VnextBusinessSpecAnalysis
): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];
  const aggregateById = toMap(analysis.ir.aggregateLifecycles, (aggregate) => aggregate.id);
  const scenarioById = toMap(analysis.ir.scenarioSequences, (scenario) => scenario.id);
  const policyById = toMap(analysis.ir.policyCoordinations, (policy) => policy.id);

  for (const context of analysis.ir.contextBoundaries) {
    const contextSummary = [
      `${context.aggregateIds.length} aggregate(s)`,
      `${context.scenarioIds.length} scenario(s)`,
      `${context.policyIds.length} policy(s)`
    ].join(", ");
    const box = measureGroupNodeBox(
      DIMENSIONS.contextGroup,
      context.title,
      context.id,
      contextSummary
    );

    nodes.push({
      id: toContextMapContextId(context.id),
      kind: "context",
      label: context.title,
      subtitle: context.id,
      summary: contextSummary,
      ...box,
      details: [
        detail("context.id", context.id),
        detail("context.owners", formatTextList(context.owners)),
        detail("context.responsibilities", formatTextList(context.responsibilities)),
        detail("context.owned_aggregates", formatTextList(context.aggregateIds)),
        detail("context.scenarios", formatTextList(context.scenarioIds)),
        detail("context.related_actors", formatTextList(context.actorIds)),
        detail("context.related_systems", formatTextList(context.systemIds)),
        detail("context.relationships", formatContextRelationships(context))
      ]
    });

    for (const aggregateId of context.aggregateIds) {
      const aggregate = mustGet(aggregateById, aggregateId, "aggregate");
      const aggregateBox = measureLeafNodeBox(
        DIMENSIONS.aggregate,
        aggregate.title,
        aggregate.id,
        `initial: ${aggregate.initialState}`
      );

      nodes.push({
        id: toContextMapAggregateId(aggregate.id),
        kind: "aggregate",
        label: aggregate.title,
        subtitle: aggregate.id,
        summary: `initial: ${aggregate.initialState}`,
        parentId: toContextMapContextId(context.id),
        ...aggregateBox,
        details: buildAggregateDetails(aggregate)
      });

      edges.push({
        id: `context-map:ownership:context:${context.id}:aggregate:${aggregate.id}`,
        kind: "ownership",
        source: toContextMapContextId(context.id),
        target: toContextMapAggregateId(aggregate.id),
        label: "owns",
        details: [
          detail("context.id", context.id),
          detail("aggregate.id", aggregate.id)
        ]
      });
    }

    for (const scenarioId of context.scenarioIds) {
      const scenario = mustGet(scenarioById, scenarioId, "scenario");
      const scenarioBox = measureLeafNodeBox(
        DIMENSIONS.actor,
        scenario.title,
        scenario.id,
        `goal: ${scenario.goal}`
      );

      nodes.push({
        id: toContextMapScenarioId(scenario.id),
        kind: "scenario",
        label: scenario.title,
        subtitle: scenario.id,
        summary: `goal: ${scenario.goal}`,
        parentId: toContextMapContextId(context.id),
        ...scenarioBox,
        details: buildScenarioDetails(scenario)
      });

      edges.push({
        id: `context-map:ownership:context:${context.id}:scenario:${scenario.id}`,
        kind: "ownership",
        source: toContextMapContextId(context.id),
        target: toContextMapScenarioId(scenario.id),
        label: "owns",
        details: [
          detail("context.id", context.id),
          detail("scenario.id", scenario.id)
        ]
      });
    }

    for (const policyId of context.policyIds) {
      const policy = mustGet(policyById, policyId, "policy");
      const policyBox = measureLeafNodeBox(
        DIMENSIONS.policy,
        policy.title,
        policy.id,
        `${policy.triggerMessageIds.length} trigger(s), ${policy.emittedMessageIds.length} emitted`
      );

      nodes.push({
        id: toContextMapPolicyId(policy.id),
        kind: "policy",
        label: policy.title,
        subtitle: policy.id,
        summary: `${policy.triggerMessageIds.length} trigger(s), ${policy.emittedMessageIds.length} emitted`,
        parentId: toContextMapContextId(context.id),
        ...policyBox,
        details: buildPolicyDetails(policy)
      });

      edges.push({
        id: `context-map:ownership:context:${context.id}:policy:${policy.id}`,
        kind: "ownership",
        source: toContextMapContextId(context.id),
        target: toContextMapPolicyId(policy.id),
        label: "owns",
        details: [
          detail("context.id", context.id),
          detail("policy.id", policy.id)
        ]
      });
    }
  }

  for (const actor of analysis.ir.actors) {
    const box = measureLeafNodeBox(
      DIMENSIONS.actor,
      actor.title,
      actor.id,
      `${actor.contextIds.length} context(s), ${actor.stepRefs.length} step(s)`
    );

    nodes.push({
      id: toContextMapActorId(actor.id),
      kind: "actor",
      label: actor.title,
      subtitle: actor.id,
      summary: `${actor.contextIds.length} context(s), ${actor.stepRefs.length} step(s)`,
      ...box,
      details: buildActorDetails(actor)
    });

    for (const contextId of actor.contextIds) {
      edges.push({
        id: `context-map:collaboration:actor:${actor.id}:context:${contextId}`,
        kind: "collaboration",
        source: toContextMapActorId(actor.id),
        target: toContextMapContextId(contextId),
        label: "participates",
        details: [
          detail("step.actor", actor.id),
          detail("context.id", contextId)
        ]
      });
    }
  }

  for (const system of analysis.ir.systems) {
    const boundarySummary = system.boundary ?? "internal";
    const box = measureLeafNodeBox(
      DIMENSIONS.system,
      system.title,
      system.id,
      boundarySummary
    );

    nodes.push({
      id: toContextMapSystemId(system.id),
      kind: "system",
      label: system.title,
      subtitle: system.id,
      summary: boundarySummary,
      ...box,
      details: buildSystemDetails(system)
    });

    for (const contextId of system.contextIds) {
      edges.push({
        id: `context-map:collaboration:system:${system.id}:context:${contextId}`,
        kind: "collaboration",
        source: toContextMapSystemId(system.id),
        target: toContextMapContextId(contextId),
        label: "touches",
        details: [
          detail("system.contexts", formatTextList([contextId])),
          detail("context.id", contextId)
        ]
      });
    }
  }

  for (const context of analysis.ir.contextBoundaries) {
    for (const relationship of context.relationships) {
      const targetId = toContextMapTargetId(relationship.target.kind, relationship.target.id);

      if (!targetId) {
        continue;
      }

      edges.push({
        id: `context-map:relationship:${context.id}:${relationship.id}`,
        kind: "collaboration",
        source: toContextMapContextId(context.id),
        target: targetId,
        label: relationship.kind,
        ...(relationship.description ? { description: relationship.description } : {}),
        details: [
          detail("context.id", context.id),
          detail("relation.from", context.id),
          detail("relation.to", `${relationship.target.kind}:${relationship.target.id}`),
          detail("context.relationships", formatContextRelationship(relationship))
        ]
      });
    }
  }

  return {
    id: "context-map",
    kind: "context-map",
    navigation: {
      tier: "primary",
      order: 10,
      default: true
    },
    title: "Context Map",
    description:
      "Shows bounded contexts, the actors and systems they collaborate with, and which scenarios, aggregates, and policies each context owns.",
    nodes,
    edges
  };
}

function buildScenarioStoryView(
  analysis: VnextBusinessSpecAnalysis
): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];

  for (const scenario of analysis.ir.scenarioSequences) {
    const groupSummary = `goal: ${scenario.goal}`;
    const groupBox = measureGroupNodeBox(
      DIMENSIONS.scenarioGroup,
      scenario.title,
      scenario.id,
      groupSummary
    );

    nodes.push({
      id: toScenarioStoryScenarioId(scenario.id),
      kind: "scenario",
      label: scenario.title,
      subtitle: scenario.id,
      summary: groupSummary,
      ...groupBox,
      details: buildScenarioDetails(scenario)
    });

    for (const step of scenario.steps) {
      const subtitle = [step.id, step.contextId].join(" | ");
      const summary = step.final
        ? step.outcome ?? "final outcome"
        : `${step.incomingMessageIds.length + step.outgoingMessageIds.length} message(s)`;
      const stepBox = measureLeafNodeBox(
        step.final ? DIMENSIONS.finalStep : DIMENSIONS.step,
        step.title,
        subtitle,
        summary
      );

      nodes.push({
        id: toScenarioStoryStepId(scenario.id, step.id),
        kind: "scenario-step",
        label: step.title,
        subtitle,
        summary,
        parentId: toScenarioStoryScenarioId(scenario.id),
        ...stepBox,
        details: buildScenarioStepDetails(step)
      });
    }

    for (const edge of scenario.edges) {
      const sourceStep = mustFind(scenario.steps, (step) => step.id === edge.sourceStepId, "scenario step");
      const targetStep = mustFind(scenario.steps, (step) => step.id === edge.targetStepId, "scenario step");
      const label = getScenarioProgressionLabel(sourceStep, targetStep);
      const details: ViewerDetailItem[] = [
        detail("scenario.id", scenario.id),
        detail("relation.from", edge.sourceStepId),
        detail("relation.to", edge.targetStepId)
      ];

      if (label !== "next") {
        details.push(detail("message.type", label));
      }

      edges.push({
        id: `scenario-story:sequence:${scenario.id}:${edge.sourceStepId}:${edge.targetStepId}`,
        kind: "sequence",
        source: toScenarioStoryStepId(scenario.id, edge.sourceStepId),
        target: toScenarioStoryStepId(scenario.id, edge.targetStepId),
        label,
        details
      });
    }
  }

  return {
    id: "scenario-story",
    kind: "scenario-story",
    navigation: {
      tier: "primary",
      order: 20
    },
    title: "Scenario Story",
    description:
      "Shows how each scenario advances step by step across contexts, including which message moves the story forward.",
    nodes,
    edges
  };
}

function buildMessageFlowView(
  analysis: VnextBusinessSpecAnalysis
): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];
  const stepNodeIds = new Set<string>();

  for (const context of analysis.ir.contextBoundaries) {
    const linkedSteps = analysis.ir.scenarioSequences.flatMap((scenario) =>
      scenario.steps.filter((step) => step.contextId === context.id)
    );
    const linkedEndpointCount = unique([
      ...analysis.ir.aggregateLifecycles
        .filter((aggregate) => aggregate.contextId === context.id)
        .map((aggregate) => aggregate.id),
      ...analysis.ir.policyCoordinations
        .filter((policy) => policy.contextId === context.id)
        .map((policy) => policy.id)
    ]).length;
    const box = measureGroupNodeBox(
      DIMENSIONS.contextGroup,
      context.title,
      context.id,
      `${linkedSteps.length} step(s), ${linkedEndpointCount} endpoint(s)`
    );

    nodes.push({
      id: toMessageFlowContextId(context.id),
      kind: "context",
      label: context.title,
      subtitle: context.id,
      summary: `${linkedSteps.length} step(s), ${linkedEndpointCount} endpoint(s)`,
      ...box,
      details: [
        detail("context.id", context.id),
        detail("context.owners", formatTextList(context.owners)),
        detail("context.related_systems", formatTextList(context.systemIds))
      ]
    });
  }

  for (const scenario of analysis.ir.scenarioSequences) {
    const scenarioBox = measureLeafNodeBox(
      DIMENSIONS.actor,
      scenario.title,
      scenario.id,
      `${scenario.steps.length} step(s), ${scenario.participatingContextIds.length} context(s)`
    );

    nodes.push({
      id: toMessageFlowScenarioId(scenario.id),
      kind: "scenario",
      label: scenario.title,
      subtitle: scenario.id,
      summary: `${scenario.steps.length} step(s), ${scenario.participatingContextIds.length} context(s)`,
      ...scenarioBox,
      details: buildScenarioDetails(scenario)
    });

    for (const step of scenario.steps) {
      const stepNodeId = toMessageFlowStepId(scenario.id, step.id);

      if (stepNodeIds.has(stepNodeId)) {
        continue;
      }

      const summary = step.final
        ? step.outcome ?? "final outcome"
        : `${step.incomingMessageIds.length} in, ${step.outgoingMessageIds.length} out`;
      const stepBox = measureLeafNodeBox(
        step.final ? DIMENSIONS.finalStep : DIMENSIONS.step,
        step.title,
        `${step.id} | ${scenario.id}`,
        summary
      );

      nodes.push({
        id: stepNodeId,
        kind: "scenario-step",
        label: step.title,
        subtitle: `${step.id} | ${scenario.id}`,
        summary,
        parentId: toMessageFlowContextId(step.contextId),
        ...stepBox,
        details: [
          detail("scenario.id", scenario.id),
          ...buildScenarioStepDetails(step)
        ]
      });
      stepNodeIds.add(stepNodeId);
    }
  }

  for (const actor of analysis.ir.actors) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "actor", actor.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.actor,
      actor.title,
      actor.id,
      `${actor.stepRefs.length} step(s)`
    );

    nodes.push({
      id: toMessageFlowActorId(actor.id),
      kind: "actor",
      label: actor.title,
      subtitle: actor.id,
      summary: `${actor.stepRefs.length} step(s)`,
      ...box,
      details: buildActorDetails(actor)
    });
  }

  for (const system of analysis.ir.systems) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "system", system.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.system,
      system.title,
      system.id,
      system.boundary ?? "internal"
    );

    nodes.push({
      id: toMessageFlowSystemId(system.id),
      kind: "system",
      label: system.title,
      subtitle: system.id,
      summary: system.boundary ?? "internal",
      ...box,
      details: buildSystemDetails(system)
    });
  }

  for (const aggregate of analysis.ir.aggregateLifecycles) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "aggregate", aggregate.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.aggregate,
      aggregate.title,
      aggregate.id,
      `initial: ${aggregate.initialState}`
    );

    nodes.push({
      id: toMessageFlowAggregateId(aggregate.id),
      kind: "aggregate",
      label: aggregate.title,
      subtitle: aggregate.id,
      summary: `initial: ${aggregate.initialState}`,
      parentId: toMessageFlowContextId(aggregate.contextId),
      ...box,
      details: buildAggregateDetails(aggregate)
    });
  }

  for (const policy of analysis.ir.policyCoordinations) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "policy", policy.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.policy,
      policy.title,
      policy.id,
      `${policy.triggerMessageIds.length} trigger(s), ${policy.emittedMessageIds.length} emitted`
    );

    nodes.push({
      id: toMessageFlowPolicyId(policy.id),
      kind: "policy",
      label: policy.title,
      subtitle: policy.id,
      summary: `${policy.triggerMessageIds.length} trigger(s), ${policy.emittedMessageIds.length} emitted`,
      ...(policy.contextId ? { parentId: toMessageFlowContextId(policy.contextId) } : {}),
      ...box,
      details: buildPolicyDetails(policy)
    });
  }

  for (const message of analysis.ir.messageFlows) {
    const messageContextIds = unique([
      ...message.producerContextIds,
      ...message.consumerContextIds
    ]);
    const subtitleParts = [message.id, message.messageKind];

    if (message.channel) {
      subtitleParts.push(message.channel);
    }

    const messageBox = measureLeafNodeBox(
      DIMENSIONS.message,
      message.title,
      subtitleParts.join(" | "),
      formatMessageTraceSummary(message)
    );

    nodes.push({
      id: toMessageFlowMessageId(message.id),
      kind: "message",
      label: message.title,
      subtitle: subtitleParts.join(" | "),
      summary: formatMessageTraceSummary(message),
      ...(messageContextIds.length === 1 ? { parentId: toMessageFlowContextId(messageContextIds[0] as string) } : {}),
      ...messageBox,
      details: buildMessageDetails(message)
    });

    for (const producer of message.producers) {
      const sourceNodeId = resolveMessageFlowEndpointNodeId(producer.kind, producer.id);

      if (!sourceNodeId) {
        continue;
      }

      edges.push({
        id: `message-flow:source:${message.id}:${producer.kind}:${producer.id}`,
        kind: "message-flow",
        source: sourceNodeId,
        target: toMessageFlowMessageId(message.id),
        label: "source",
        details: [
          detail("message.type", message.id),
          detail("relation.from", `${producer.kind}:${producer.id}`),
          detail("relation.to", message.id)
        ]
      });
    }

    for (const consumer of message.consumers) {
      const targetNodeId = resolveMessageFlowEndpointNodeId(consumer.kind, consumer.id);

      if (!targetNodeId) {
        continue;
      }

      edges.push({
        id: `message-flow:target:${message.id}:${consumer.kind}:${consumer.id}`,
        kind: "message-flow",
        source: toMessageFlowMessageId(message.id),
        target: targetNodeId,
        label: "target",
        details: [
          detail("message.type", message.id),
          detail("relation.from", message.id),
          detail("relation.to", `${consumer.kind}:${consumer.id}`)
        ]
      });
    }

    for (const link of message.stepLinks) {
      const stepNodeId = toMessageFlowStepId(link.scenarioId, link.stepId);

      if (link.direction === "outgoing") {
        edges.push({
          id: `message-flow:step-outgoing:${message.id}:${link.scenarioId}:${link.stepId}`,
          kind: "message-flow",
          source: stepNodeId,
          target: toMessageFlowMessageId(message.id),
          label: messageVerbForOutgoing(message.messageKind),
          details: [
            detail("scenario.id", link.scenarioId),
            detail("step.id", link.stepId),
            detail("message.type", message.id)
          ]
        });
        continue;
      }

      edges.push({
        id: `message-flow:step-incoming:${message.id}:${link.scenarioId}:${link.stepId}`,
        kind: "message-flow",
        source: toMessageFlowMessageId(message.id),
        target: stepNodeId,
        label: "feeds",
        details: [
          detail("scenario.id", link.scenarioId),
          detail("step.id", link.stepId),
          detail("message.type", message.id)
        ]
      });
    }
  }

  for (const scenario of analysis.ir.scenarioSequences) {
    for (const edge of scenario.edges) {
      const sourceStep = mustFind(scenario.steps, (step) => step.id === edge.sourceStepId, "scenario step");
      const targetStep = mustFind(scenario.steps, (step) => step.id === edge.targetStepId, "scenario step");

      edges.push({
        id: `message-flow:sequence:${scenario.id}:${edge.sourceStepId}:${edge.targetStepId}`,
        kind: "sequence",
        source: toMessageFlowStepId(scenario.id, edge.sourceStepId),
        target: toMessageFlowStepId(scenario.id, edge.targetStepId),
        label: getScenarioProgressionLabel(sourceStep, targetStep),
        details: [
          detail("scenario.id", scenario.id),
          detail("relation.from", edge.sourceStepId),
          detail("relation.to", edge.targetStepId)
        ]
      });
    }
  }

  return {
    id: "message-flow",
    kind: "message-flow",
    navigation: {
      tier: "primary",
      order: 30
    },
    title: "Message Flow / Trace",
    description:
      "Shows how commands, events, and queries move between contexts, endpoints, and scenario steps, including cross-context hops.",
    nodes,
    edges
  };
}

function buildLifecycleView(
  analysis: VnextBusinessSpecAnalysis
): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];
  const lifecycleAggregates = projectVnextLifecycle(analysis.ir);

  for (const aggregate of lifecycleAggregates) {
    const groupBox = measureGroupNodeBox(
      DIMENSIONS.aggregateGroup,
      aggregate.title,
      `${aggregate.id} | ${aggregate.contextId}`,
      `initial: ${aggregate.initialState}`
    );

    nodes.push({
      id: toLifecycleAggregateId(aggregate.id),
      kind: "aggregate",
      label: aggregate.title,
      subtitle: `${aggregate.id} | ${aggregate.contextId}`,
      summary: `initial: ${aggregate.initialState}`,
      ...groupBox,
      details: buildAggregateDetails(aggregate)
    });

    for (const state of aggregate.states) {
      const emittedMessageIds = aggregate.transitions
        .filter((transition) => transition.fromStateId === state.id)
        .flatMap((transition) => transition.emittedMessageIds);
      const stateBox = measureLeafNodeBox(
        DIMENSIONS.lifecycleState,
        state.id,
        state.reachableFromInitial ? "reachable" : "unreachable",
        state.terminal ? "terminal" : `${state.outgoingTransitionIds.length} transition(s)`
      );

      nodes.push({
        id: toLifecycleStateId(aggregate.id, state.id),
        kind: "lifecycle-state",
        label: state.id,
        subtitle: state.reachableFromInitial ? "reachable" : "unreachable",
        summary: state.terminal ? "terminal" : `${state.outgoingTransitionIds.length} transition(s)`,
        parentId: toLifecycleAggregateId(aggregate.id),
        ...stateBox,
        details: [
          detail("aggregate.id", aggregate.id),
          detail("aggregate.context", aggregate.contextId),
          detail("aggregate.state.id", state.id),
          detail("aggregate.state.reachable", state.reachableFromInitial ? "yes" : "no"),
          detail("aggregate.state.outgoing_messages", formatTextList(unique(emittedMessageIds)))
        ]
      });
    }

    for (const transition of aggregate.transitions) {
      edges.push(toLifecycleTransitionEdge(aggregate, transition));
    }
  }

  return {
    id: "lifecycle",
    kind: "lifecycle",
    navigation: {
      tier: "primary",
      order: 40
    },
    title: "Lifecycle",
    description:
      "Shows aggregate state transitions, the message that triggers each transition, and which follow-up messages each transition emits.",
    nodes,
    edges
  };
}

function buildPolicySagaView(
  analysis: VnextBusinessSpecAnalysis
): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];

  for (const policy of analysis.ir.policyCoordinations) {
    const policyBox = measureLeafNodeBox(
      DIMENSIONS.policy,
      policy.title,
      policy.id,
      `${policy.triggerMessageIds.length} trigger(s), ${policy.emittedMessageIds.length} emitted`
    );

    nodes.push({
      id: toPolicyViewPolicyId(policy.id),
      kind: "policy",
      label: policy.title,
      subtitle: policy.id,
      summary: `${policy.triggerMessageIds.length} trigger(s), ${policy.emittedMessageIds.length} emitted`,
      ...policyBox,
      details: buildPolicyDetails(policy)
    });

    for (const messageId of policy.triggerMessageIds) {
      nodes.push(...ensurePolicyViewMessageNode(nodes, analysis.ir.messageFlows, messageId));
      edges.push({
        id: `policy-saga:trigger:${policy.id}:${messageId}`,
        kind: "coordination",
        source: toPolicyViewMessageId(messageId),
        target: toPolicyViewPolicyId(policy.id),
        label: "triggers",
        details: [
          detail("policy.id", policy.id),
          detail("message.type", messageId)
        ]
      });
    }

    for (const messageId of policy.emittedMessageIds) {
      nodes.push(...ensurePolicyViewMessageNode(nodes, analysis.ir.messageFlows, messageId));
      edges.push({
        id: `policy-saga:emit:${policy.id}:${messageId}`,
        kind: "coordination",
        source: toPolicyViewPolicyId(policy.id),
        target: toPolicyViewMessageId(messageId),
        label: "emits",
        details: [
          detail("policy.id", policy.id),
          detail("message.type", messageId)
        ]
      });
    }
  }

  return {
    id: "policy-saga",
    kind: "policy-saga",
    navigation: {
      tier: "secondary",
      order: 50
    },
    title: "Policy / Saga",
    description:
      "Shows which messages trigger each coordination policy and which follow-up messages that policy emits.",
    nodes,
    edges
  };
}

function buildActorDetails(actor: VnextActorParticipant): ViewerDetailItem[] {
  return [
    detail("actor.type", actor.actorType ?? "unspecified"),
    detail("actor.contexts", formatTextList(actor.contextIds)),
    detail("actor.scenarios", formatTextList(actor.scenarioIds)),
    detail(
      "actor.scenario_steps",
      formatTextList(
        actor.stepRefs.map(
          (stepRef) => `${stepRef.scenarioId}.${stepRef.stepId} (${stepRef.contextId})`
        )
      )
    )
  ];
}

function buildSystemDetails(system: VnextSystemParticipant): ViewerDetailItem[] {
  return [
    detail("system.boundary", system.boundary ?? "internal"),
    detail("system.capabilities", formatTextList(system.capabilities)),
    detail("system.contexts", formatTextList(system.contextIds)),
    detail("system.dependencies", formatSystemDependencies(system))
  ];
}

function buildScenarioDetails(scenario: VnextScenarioSequence): ViewerDetailItem[] {
  return [
    detail("scenario.id", scenario.id),
    detail("scenario.goal", scenario.goal),
    detail("scenario.owner_context", scenario.ownerContextId),
    detail(
      "scenario.participating_contexts",
      formatTextList(scenario.participatingContextIds)
    ),
    detail("scenario.actors", formatTextList(scenario.actorIds)),
    detail("scenario.systems", formatTextList(scenario.systemIds)),
    detail("scenario.final_steps", formatTextList(scenario.finalStepIds))
  ];
}

function buildScenarioStepDetails(step: VnextScenarioStep): ViewerDetailItem[] {
  return [
    detail("step.id", step.id),
    detail("step.context", step.contextId),
    detail("step.entry", step.entry ? "yes" : "no"),
    detail("step.final", step.final ? "yes" : "no"),
    ...(step.actorId ? [detail("step.actor", step.actorId)] : []),
    ...(step.systemId ? [detail("step.system", step.systemId)] : []),
    detail("step.incoming_messages", formatTextList(step.incomingMessageIds)),
    detail("step.outgoing_messages", formatTextList(step.outgoingMessageIds)),
    ...(step.outcome ? [detail("step.outcome", step.outcome)] : [])
  ];
}

function buildMessageDetails(message: VnextMessageFlow): ViewerDetailItem[] {
  return [
    detail("message.kind", message.messageKind),
    detail("message.type", message.id),
    detail("message.channel", message.channel ?? "unspecified"),
    detail("message.endpoints", formatMessageEndpoints(message)),
    detail(
      "message.crosses_context_boundary",
      message.crossesContextBoundary ? "yes" : "no"
    ),
    detail("message.step_links", formatMessageStepLinks(message.stepLinks)),
    detail("message.payload_fields", formatPayloadFields(message.payload))
  ];
}

function buildAggregateDetails(aggregate: VnextAggregateLifecycle): ViewerDetailItem[] {
  return [
    detail("aggregate.id", aggregate.id),
    detail("aggregate.context", aggregate.contextId),
    detail("aggregate.initial_state", aggregate.initialState),
    detail("aggregate.lifecycle", formatTextList(aggregate.states.map((state) => state.id))),
    detail("aggregate.accepted_messages", formatTextList(aggregate.acceptedMessageIds)),
    detail("aggregate.emitted_messages", formatTextList(aggregate.emittedMessageIds)),
    detail("aggregate.reachable_states", formatTextList(aggregate.reachableStateIds)),
    detail("aggregate.unreachable_states", formatTextList(aggregate.unreachableStateIds))
  ];
}

function buildPolicyDetails(policy: VnextPolicyCoordination): ViewerDetailItem[] {
  return [
    detail("policy.id", policy.id),
    detail("policy.context", policy.contextId ?? "none"),
    detail("policy.trigger_messages", formatTextList(policy.triggerMessageIds)),
    detail("policy.emitted_messages", formatTextList(policy.emittedMessageIds)),
    detail("policy.target_systems", formatTextList(policy.targetSystemIds)),
    detail("policy.related_contexts", formatTextList(policy.relatedContextIds)),
    detail("policy.coordinates", formatPolicyCoordinates(policy))
  ];
}

function toLifecycleTransitionEdge(
  aggregate: VnextAggregateLifecycle,
  transition: VnextLifecycleTransition
): ViewerViewSpec["edges"][number] {
  const edgeLabel = transition.emittedMessageIds.length > 0
    ? `${transition.onMessageId} / ${transition.emittedMessageIds.join(", ")}`
    : transition.onMessageId;

  return {
    id: `lifecycle:transition:${aggregate.id}:${transition.id}`,
    kind: "state-transition",
    source: toLifecycleStateId(aggregate.id, transition.fromStateId),
    target: toLifecycleStateId(aggregate.id, transition.toStateId),
    label: edgeLabel,
    details: [
      detail("aggregate.id", aggregate.id),
      detail("aggregate.context", aggregate.contextId),
      detail("relation.from", transition.fromStateId),
      detail("relation.to", transition.toStateId),
      detail("transition.trigger_message", transition.onMessageId),
      detail("transition.emitted_messages", formatTextList(transition.emittedMessageIds))
    ]
  };
}

function ensurePolicyViewMessageNode(
  existingNodes: readonly ViewerNodeSpec[],
  messages: readonly VnextMessageFlow[],
  messageId: string
): ViewerNodeSpec[] {
  const nodeId = toPolicyViewMessageId(messageId);

  if (existingNodes.some((node) => node.id === nodeId)) {
    return [];
  }

  const message = mustFind(messages, (candidate) => candidate.id === messageId, "message");
  const box = measureLeafNodeBox(
    DIMENSIONS.message,
    message.title,
    `${message.id} | ${message.messageKind}`,
    formatMessageTraceSummary(message)
  );

  return [
    {
      id: nodeId,
      kind: "message",
      label: message.title,
      subtitle: `${message.id} | ${message.messageKind}`,
      summary: formatMessageTraceSummary(message),
      ...box,
      details: buildMessageDetails(message)
    }
  ];
}

function formatContextRelationships(context: VnextContextBoundary): ViewerDetailValue {
  if (context.relationships.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(context.relationships.map((relationship) => formatContextRelationship(relationship)));
}

function formatContextRelationship(
  relationship: VnextContextBoundary["relationships"][number]
): ViewerDetailValue {
  return recordDetailValue([
    recordDetailEntry("Relationship", textDetailValue(relationship.id)),
    recordDetailEntry("Kind", textDetailValue(relationship.kind)),
    ...(relationship.direction
      ? [recordDetailEntry("Direction", textDetailValue(relationship.direction))]
      : []),
    ...(relationship.integration
      ? [recordDetailEntry("Integration", textDetailValue(relationship.integration))]
      : []),
    recordDetailEntry(
      "Target",
      textDetailValue(`${relationship.target.kind}:${relationship.target.id}`)
    ),
    ...(relationship.description
      ? [recordDetailEntry("Description", textDetailValue(relationship.description))]
      : [])
  ]);
}

function formatSystemDependencies(system: VnextSystemParticipant): ViewerDetailValue {
  if (system.dependencyRefs.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    system.dependencyRefs.map((dependency) =>
      recordDetailValue([
        recordDetailEntry("Kind", textDetailValue(dependency.kind)),
        recordDetailEntry("Contexts", formatTextList(dependency.contextIds)),
        ...(dependency.scenarioId
          ? [recordDetailEntry("Scenario", textDetailValue(dependency.scenarioId))]
          : []),
        ...(dependency.stepId
          ? [recordDetailEntry("Step", textDetailValue(dependency.stepId))]
          : []),
        ...(dependency.messageId
          ? [recordDetailEntry("Message", textDetailValue(dependency.messageId))]
          : []),
        ...(dependency.policyId
          ? [recordDetailEntry("Policy", textDetailValue(dependency.policyId))]
          : []),
        ...(dependency.description
          ? [recordDetailEntry("Description", textDetailValue(dependency.description))]
          : [])
      ])
    )
  );
}

function formatMessageEndpoints(message: VnextMessageFlow): ViewerDetailValue {
  return recordDetailValue([
    recordDetailEntry(
      "Sources",
      formatTextList(message.producers.map((producer) => formatEndpointRef(producer.kind, producer.id)))
    ),
    recordDetailEntry(
      "Targets",
      formatTextList(message.consumers.map((consumer) => formatEndpointRef(consumer.kind, consumer.id)))
    ),
    recordDetailEntry("Source contexts", formatTextList(message.producerContextIds)),
    recordDetailEntry("Target contexts", formatTextList(message.consumerContextIds))
  ]);
}

function formatMessageStepLinks(stepLinks: readonly VnextMessageStepLink[]): ViewerDetailValue {
  if (stepLinks.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    stepLinks.map((link) =>
      recordDetailValue([
        recordDetailEntry("Direction", textDetailValue(link.direction)),
        recordDetailEntry("Scenario", textDetailValue(link.scenarioId)),
        recordDetailEntry("Step", textDetailValue(link.stepId)),
        recordDetailEntry("Context", textDetailValue(link.contextId))
      ])
    )
  );
}

function formatPolicyCoordinates(policy: VnextPolicyCoordination): ViewerDetailValue {
  if (policy.coordinates.length === 0) {
    return textDetailValue("none");
  }

  return formatTextList(
    policy.coordinates.map((coordinate) => formatEndpointRef(coordinate.kind, coordinate.id))
  );
}

function formatPayloadFields(
  fields: readonly {
    id: string;
    type: string;
    required: boolean;
    description?: string;
  }[]
): ViewerDetailValue {
  if (fields.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    fields.map((field) =>
      fieldDetailValue({
        name: field.id,
        fieldType: field.type,
        required: field.required,
        description: field.description ?? "No description available."
      })
    )
  );
}

function formatMessageTraceSummary(message: VnextMessageFlow): string {
  const producerContexts = message.producerContextIds.join(", ");
  const consumerContexts = message.consumerContextIds.join(", ");

  if (producerContexts && consumerContexts) {
    return producerContexts === consumerContexts
      ? producerContexts
      : `${producerContexts} -> ${consumerContexts}`;
  }

  if (producerContexts) {
    return `${producerContexts} -> external`;
  }

  if (consumerContexts) {
    return `external -> ${consumerContexts}`;
  }

  return "external hop";
}

function getScenarioProgressionLabel(
  sourceStep: VnextScenarioStep,
  targetStep: VnextScenarioStep
): string {
  const sharedMessageIds = sourceStep.outgoingMessageIds.filter((messageId) =>
    targetStep.incomingMessageIds.includes(messageId)
  );

  if (sharedMessageIds.length > 0) {
    return sharedMessageIds.join(", ");
  }

  return targetStep.incomingMessageIds[0] ?? sourceStep.outgoingMessageIds[0] ?? "next";
}

function hasEndpoint(
  message: VnextMessageFlow,
  kind: string,
  id: string
): boolean {
  return [...message.producers, ...message.consumers].some(
    (endpoint) => endpoint.kind === kind && endpoint.id === id
  );
}

function messageVerbForOutgoing(messageKind: VnextMessageKind): string {
  switch (messageKind) {
    case "command":
      return "issues";
    case "event":
      return "publishes";
    case "query":
      return "asks";
  }
}

function formatEndpointRef(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function detail(
  semanticKey: SemanticKey,
  value: ViewerDetailValue | string
): ViewerDetailItem {
  return {
    semanticKey,
    label: VNEXT_VIEWER_DETAIL_SEMANTICS[semanticKey].label,
    value: typeof value === "string" ? textDetailValue(value) : value
  };
}

function textDetailValue(text: string): ViewerDetailValue {
  return {
    kind: "text",
    text
  };
}

function listDetailValue(items: readonly ViewerDetailValue[]): ViewerDetailValue {
  return {
    kind: "list",
    items
  };
}

function recordDetailEntry(label: string, value: ViewerDetailValue) {
  return {
    label,
    value
  };
}

function recordDetailValue(
  entries: readonly {
    label: string;
    value: ViewerDetailValue;
  }[]
): ViewerDetailValue {
  return {
    kind: "record",
    entries
  };
}

function fieldDetailValue(input: {
  name: string;
  fieldType: string;
  required: boolean;
  description?: string;
}): ViewerDetailValue {
  return {
    kind: "field",
    name: input.name,
    fieldType: input.fieldType,
    required: input.required,
    ...(input.description ? { description: input.description } : {})
  };
}

function formatTextList(values: readonly string[]): ViewerDetailValue {
  if (values.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(values.map((value) => textDetailValue(value)));
}

function measureLeafNodeBox(
  preset: {
    width: number;
    minHeight: number;
    charsPerLine: number;
  },
  label: string,
  subtitle?: string,
  summary?: string
): Pick<ViewerNodeSpec, "width" | "height"> {
  const sectionCount = 2 + (subtitle ? 1 : 0) + (summary ? 1 : 0);
  const lineHeight =
    estimateLineCount(label, preset.charsPerLine) * 19 +
    (subtitle ? estimateLineCount(subtitle, preset.charsPerLine) * 16 : 0) +
    (summary ? estimateLineCount(summary, preset.charsPerLine) * 16 : 0);
  const gapHeight = (sectionCount - 1) * 8;
  const totalHeight = 28 + 20 + gapHeight + lineHeight;

  return {
    width: preset.width,
    height: Math.max(preset.minHeight, totalHeight)
  };
}

function measureGroupNodeBox(
  preset: {
    width: number;
    minHeight: number;
    charsPerLine: number;
    minHeaderHeight: number;
  },
  label: string,
  subtitle?: string,
  summary?: string
): Pick<ViewerNodeSpec, "width" | "height" | "headerHeight"> {
  const sectionCount = 2 + (subtitle ? 1 : 0) + (summary ? 1 : 0);
  const lineHeight =
    estimateLineCount(label, preset.charsPerLine) * 19 +
    (subtitle ? estimateLineCount(subtitle, preset.charsPerLine) * 16 : 0) +
    (summary ? estimateLineCount(summary, preset.charsPerLine) * 16 : 0);
  const gapHeight = (sectionCount - 1) * 4;
  const headerHeight = Math.max(preset.minHeaderHeight, 26 + 18 + gapHeight + lineHeight);

  return {
    width: preset.width,
    height: Math.max(preset.minHeight, headerHeight + 72),
    headerHeight
  };
}

function estimateLineCount(text: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function toMap<Value, Key extends string>(
  values: readonly Value[],
  getKey: (value: Value) => Key
): ReadonlyMap<Key, Value> {
  return new Map(values.map((value) => [getKey(value), value] as const));
}

function mustGet<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key, label: string): Value {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Unknown ${label} ${String(key)}`);
  }

  return value;
}

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean,
  label: string
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error(`Unknown ${label}`);
  }

  return value;
}

function unique<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
}

function toContextMapContextId(contextId: string): string {
  return `context-map:context:${contextId}`;
}

function toContextMapAggregateId(aggregateId: string): string {
  return `context-map:aggregate:${aggregateId}`;
}

function toContextMapScenarioId(scenarioId: string): string {
  return `context-map:scenario:${scenarioId}`;
}

function toContextMapActorId(actorId: string): string {
  return `context-map:actor:${actorId}`;
}

function toContextMapSystemId(systemId: string): string {
  return `context-map:system:${systemId}`;
}

function toContextMapPolicyId(policyId: string): string {
  return `context-map:policy:${policyId}`;
}

function toContextMapTargetId(kind: string, id: string): string | undefined {
  switch (kind) {
    case "context":
      return toContextMapContextId(id);
    case "actor":
      return toContextMapActorId(id);
    case "system":
      return toContextMapSystemId(id);
    case "scenario":
      return toContextMapScenarioId(id);
    case "aggregate":
      return toContextMapAggregateId(id);
    case "policy":
      return toContextMapPolicyId(id);
    default:
      return undefined;
  }
}

function toScenarioStoryScenarioId(scenarioId: string): string {
  return `scenario-story:scenario:${scenarioId}`;
}

function toScenarioStoryStepId(scenarioId: string, stepId: string): string {
  return `scenario-story:scenario:${scenarioId}:step:${stepId}`;
}

function toMessageFlowContextId(contextId: string): string {
  return `message-flow:context:${contextId}`;
}

function toMessageFlowScenarioId(scenarioId: string): string {
  return `message-flow:scenario:${scenarioId}`;
}

function toMessageFlowStepId(scenarioId: string, stepId: string): string {
  return `message-flow:scenario:${scenarioId}:step:${stepId}`;
}

function toMessageFlowActorId(actorId: string): string {
  return `message-flow:actor:${actorId}`;
}

function toMessageFlowSystemId(systemId: string): string {
  return `message-flow:system:${systemId}`;
}

function toMessageFlowAggregateId(aggregateId: string): string {
  return `message-flow:aggregate:${aggregateId}`;
}

function toMessageFlowPolicyId(policyId: string): string {
  return `message-flow:policy:${policyId}`;
}

function toMessageFlowMessageId(messageId: string): string {
  return `message-flow:message:${messageId}`;
}

function resolveMessageFlowEndpointNodeId(kind: string, id: string): string | undefined {
  switch (kind) {
    case "context":
      return toMessageFlowContextId(id);
    case "actor":
      return toMessageFlowActorId(id);
    case "system":
      return toMessageFlowSystemId(id);
    case "scenario":
      return toMessageFlowScenarioId(id);
    case "aggregate":
      return toMessageFlowAggregateId(id);
    case "policy":
      return toMessageFlowPolicyId(id);
    default:
      return undefined;
  }
}

function toLifecycleAggregateId(aggregateId: string): string {
  return `lifecycle:aggregate:${aggregateId}`;
}

function toLifecycleStateId(aggregateId: string, stateId: string): string {
  return `lifecycle:aggregate:${aggregateId}:state:${stateId}`;
}

function toPolicyViewPolicyId(policyId: string): string {
  return `policy-saga:policy:${policyId}`;
}

function toPolicyViewMessageId(messageId: string): string {
  return `policy-saga:message:${messageId}`;
}
