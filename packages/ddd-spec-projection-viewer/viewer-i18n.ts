import {
  DEFAULT_VIEWER_LOCALE,
  type ViewerLocale
} from "../ddd-spec-viewer-contract/index.js";

interface ViewerSemanticDefinition {
  label: string;
  description: string;
}

const VIEWER_DETAIL_SEMANTICS_EN = {
  "context.id": {
    label: "Context",
    description: "The bounded context currently shown as the business ownership boundary."
  },
  "context.owners": {
    label: "Owners",
    description: "Teams, roles, or organizations that carry business responsibility for this context."
  },
  "context.responsibilities": {
    label: "Responsibilities",
    description: "The business responsibilities explicitly assigned to this context."
  },
  "context.owned_aggregates": {
    label: "Owned aggregates",
    description: "Aggregates modeled inside this context boundary."
  },
  "context.scenarios": {
    label: "Scenarios",
    description: "Scenarios on the default learning path for this context."
  },
  "context.related_actors": {
    label: "Actors",
    description: "Actors that initiate or participate in steps inside this context."
  },
  "context.related_systems": {
    label: "Systems",
    description: "Systems this context collaborates with, depends on, or calls."
  },
  "context.relationships": {
    label: "Relationships",
    description: "External collaborations or dependencies explicitly declared for this context."
  },
  "actor.type": {
    label: "Actor type",
    description: "The participant type for this actor, such as person, role, or team."
  },
  "actor.contexts": {
    label: "Contexts",
    description: "Contexts where this actor participates in at least one step."
  },
  "actor.scenarios": {
    label: "Scenarios",
    description: "Scenarios where this actor appears."
  },
  "actor.scenario_steps": {
    label: "Scenario steps",
    description: "Scenario steps where this actor explicitly participates."
  },
  "system.boundary": {
    label: "Boundary",
    description: "Whether this system is modeled as an internal capability or an external dependency."
  },
  "system.capabilities": {
    label: "Capabilities",
    description: "Capabilities this system explicitly provides to the business model."
  },
  "system.contexts": {
    label: "Contexts",
    description: "Contexts that depend on this system or collaborate with it through messages."
  },
  "system.dependencies": {
    label: "Dependencies",
    description: "Which contexts, messages, or policies refer to this system and how."
  },
  "scenario.id": {
    label: "Scenario",
    description: "The end-to-end business scenario used as the default reading storyline."
  },
  "scenario.goal": {
    label: "Goal",
    description: "The business goal this scenario tries to achieve."
  },
  "scenario.owner_context": {
    label: "Owner context",
    description: "The context that owns the main narrative and responsibility for this scenario."
  },
  "scenario.participating_contexts": {
    label: "Participating contexts",
    description: "Contexts touched while this scenario advances."
  },
  "scenario.actors": {
    label: "Actors",
    description: "Actors that appear in this scenario."
  },
  "scenario.systems": {
    label: "Systems",
    description: "Systems that appear in this scenario."
  },
  "scenario.final_steps": {
    label: "Final steps",
    description: "Final steps where this scenario can conclude."
  },
  "step.id": {
    label: "Step",
    description: "A single business step inside the scenario story."
  },
  "step.context": {
    label: "Context",
    description: "The business context that owns this step."
  },
  "step.actor": {
    label: "Actor",
    description: "The actor that initiates or leads this step."
  },
  "step.system": {
    label: "System",
    description: "The system directly touched or invoked by this step."
  },
  "step.entry": {
    label: "Entry",
    description: "Whether this step is marked as the scenario entry point."
  },
  "step.final": {
    label: "Final",
    description: "Whether this step is a final business outcome instead of ongoing work."
  },
  "step.incoming_messages": {
    label: "Incoming messages",
    description: "Messages this step receives or observes."
  },
  "step.outgoing_messages": {
    label: "Outgoing messages",
    description: "Messages this step sends, triggers, or requests."
  },
  "step.outcome": {
    label: "Outcome",
    description: "A short description of the business result when the scenario ends at this step."
  },
  "message.kind": {
    label: "Message kind",
    description: "The message category, such as command, event, or query."
  },
  "message.type": {
    label: "Message",
    description: "The business message identifier shown in this view."
  },
  "message.channel": {
    label: "Channel",
    description: "Whether the message is expected to travel through sync or async delivery."
  },
  "message.endpoints": {
    label: "Endpoints",
    description: "The source, target, and their owning contexts for this message."
  },
  "message.crosses_context_boundary": {
    label: "Crosses context boundary",
    description: "Whether this message crosses more than one business context."
  },
  "message.step_links": {
    label: "Scenario links",
    description: "Scenario steps linked to this message as incoming or outgoing references."
  },
  "message.payload_fields": {
    label: "Payload fields",
    description: "Payload fields defined on this message contract and the meaning of each field."
  },
  "aggregate.id": {
    label: "Aggregate",
    description: "The aggregate that owns this node or relation."
  },
  "aggregate.context": {
    label: "Context",
    description: "The business context that owns this aggregate lifecycle."
  },
  "aggregate.initial_state": {
    label: "Initial state",
    description: "The default state at the beginning of the aggregate lifecycle."
  },
  "aggregate.lifecycle": {
    label: "Lifecycle",
    description: "All lifecycle states defined for this aggregate."
  },
  "aggregate.accepted_messages": {
    label: "Accepted messages",
    description: "Messages that drive transitions in this aggregate lifecycle."
  },
  "aggregate.emitted_messages": {
    label: "Emitted messages",
    description: "Messages this aggregate emits during lifecycle transitions."
  },
  "aggregate.reachable_states": {
    label: "Reachable states",
    description: "States that can be reached legally from the initial state."
  },
  "aggregate.unreachable_states": {
    label: "Unreachable states",
    description: "States that remain unreachable in the current lifecycle."
  },
  "aggregate.state.id": {
    label: "State",
    description: "The lifecycle state currently being shown."
  },
  "aggregate.state.reachable": {
    label: "Reachable",
    description: "Whether this state can be reached from the initial state."
  },
  "aggregate.state.outgoing_messages": {
    label: "Outgoing messages",
    description: "Messages emitted by transitions that leave this state."
  },
  "transition.trigger_message": {
    label: "Trigger message",
    description: "The message that triggers this lifecycle transition."
  },
  "transition.emitted_messages": {
    label: "Emitted messages",
    description: "Additional messages emitted by this lifecycle transition."
  },
  "relation.from": {
    label: "From",
    description: "The source state, source step, or source node for this relation."
  },
  "relation.to": {
    label: "To",
    description: "The target state, target step, or target node for this relation."
  },
  "policy.id": {
    label: "Policy",
    description: "The identifier of the current coordination policy or saga."
  },
  "policy.context": {
    label: "Context",
    description: "The business context where this policy is declared or owned."
  },
  "policy.trigger_messages": {
    label: "Trigger messages",
    description: "Messages that trigger this policy."
  },
  "policy.emitted_messages": {
    label: "Emitted messages",
    description: "Messages this policy emits as follow-up work."
  },
  "policy.target_systems": {
    label: "Target systems",
    description: "Systems this policy calls or coordinates."
  },
  "policy.related_contexts": {
    label: "Related contexts",
    description: "Contexts this policy touches or coordinates."
  },
  "policy.coordinates": {
    label: "Coordinates",
    description: "Business resources explicitly coordinated by this policy."
  }
} as const satisfies Record<string, ViewerSemanticDefinition>;

export type ViewerSemanticKey = keyof typeof VIEWER_DETAIL_SEMANTICS_EN;

const VIEWER_DETAIL_SEMANTICS_ZH_CN = {
  "context.id": {
    label: "上下文",
    description: "当前作为业务所有权边界展示的 bounded context。"
  },
  "context.owners": {
    label: "负责方",
    description: "对当前 context 负业务责任的团队、角色或组织。"
  },
  "context.responsibilities": {
    label: "职责",
    description: "当前 context 明确承担的业务职责集合。"
  },
  "context.owned_aggregates": {
    label: "拥有的聚合",
    description: "当前 context 边界内部建模的聚合集合。"
  },
  "context.scenarios": {
    label: "场景",
    description: "当前 context 默认教学路径下的业务场景集合。"
  },
  "context.related_actors": {
    label: "参与者",
    description: "会在当前 context 边界内发起或参与步骤的 actor 集合。"
  },
  "context.related_systems": {
    label: "系统",
    description: "当前 context 会协作、依赖或调用的系统集合。"
  },
  "context.relationships": {
    label: "关系",
    description: "当前 context 显式声明的外部协作或依赖关系。"
  },
  "actor.type": {
    label: "参与者类型",
    description: "当前 actor 的参与者类型，例如 person、role 或 team。"
  },
  "actor.contexts": {
    label: "上下文",
    description: "当前 actor 参与过步骤的 context 集合。"
  },
  "actor.scenarios": {
    label: "场景",
    description: "当前 actor 参与过的场景集合。"
  },
  "actor.scenario_steps": {
    label: "场景步骤",
    description: "当前 actor 在哪些场景步骤中显式参与。"
  },
  "system.boundary": {
    label: "边界",
    description: "当前系统属于内部能力还是外部依赖。"
  },
  "system.capabilities": {
    label: "能力",
    description: "当前系统向业务建模显式提供的能力集合。"
  },
  "system.contexts": {
    label: "上下文",
    description: "当前系统与哪些业务 context 存在依赖或消息协作。"
  },
  "system.dependencies": {
    label: "依赖",
    description: "当前系统被哪些 context、message 或 policy 以何种方式引用。"
  },
  "scenario.id": {
    label: "场景",
    description: "作为默认阅读主线的端到端业务场景。"
  },
  "scenario.goal": {
    label: "目标",
    description: "该场景试图达成的业务目标。"
  },
  "scenario.owner_context": {
    label: "所属上下文",
    description: "拥有该场景主叙事和业务责任的 context。"
  },
  "scenario.participating_contexts": {
    label: "参与的上下文",
    description: "该场景推进过程中会触达的 context 集合。"
  },
  "scenario.actors": {
    label: "参与者",
    description: "在该场景步骤中出现过的 actor 集合。"
  },
  "scenario.systems": {
    label: "系统",
    description: "在该场景步骤中出现过的系统集合。"
  },
  "scenario.final_steps": {
    label: "终局步骤",
    description: "该场景允许收束到的终局步骤集合。"
  },
  "step.id": {
    label: "步骤",
    description: "场景故事中的单个业务步骤。"
  },
  "step.context": {
    label: "上下文",
    description: "当前步骤所属的业务 context。"
  },
  "step.actor": {
    label: "参与者",
    description: "当前步骤由哪个 actor 发起或主导。"
  },
  "step.system": {
    label: "系统",
    description: "当前步骤直接接触或调用的系统。"
  },
  "step.entry": {
    label: "入口",
    description: "标记该步骤是否为场景入口。"
  },
  "step.final": {
    label: "终局",
    description: "标记该步骤是否为终局业务结果，而不是继续推进中的工作步骤。"
  },
  "step.incoming_messages": {
    label: "入站消息",
    description: "当前步骤会接收或观察的消息集合。"
  },
  "step.outgoing_messages": {
    label: "出站消息",
    description: "当前步骤会发出、触发或请求的消息集合。"
  },
  "step.outcome": {
    label: "结果",
    description: "当场景走到终局步骤时，对业务结果的简短说明。"
  },
  "message.kind": {
    label: "消息类型",
    description: "当前消息的类别，例如 command、event 或 query。"
  },
  "message.type": {
    label: "消息",
    description: "当前视图中展示或讨论的业务消息标识。"
  },
  "message.channel": {
    label: "通道",
    description: "当前消息预期通过 sync 或 async 方式传递。"
  },
  "message.endpoints": {
    label: "端点",
    description: "当前消息的 source、target 以及它们所在的 context。"
  },
  "message.crosses_context_boundary": {
    label: "跨上下文边界",
    description: "当前消息是否跨越多个业务 context。"
  },
  "message.step_links": {
    label: "场景关联",
    description: "当前消息与哪些场景步骤存在 incoming 或 outgoing 绑定。"
  },
  "message.payload_fields": {
    label: "负载字段",
    description: "当前消息契约中的 payload 字段，以及每个字段的语义说明。"
  },
  "aggregate.id": {
    label: "聚合",
    description: "当前节点或关系所属的聚合对象。"
  },
  "aggregate.context": {
    label: "上下文",
    description: "拥有该 aggregate 生命周期的业务 context。"
  },
  "aggregate.initial_state": {
    label: "初始状态",
    description: "聚合生命周期开始时的默认状态。"
  },
  "aggregate.lifecycle": {
    label: "生命周期",
    description: "该聚合定义的全部生命周期状态集合。"
  },
  "aggregate.accepted_messages": {
    label: "接收的消息",
    description: "驱动该 aggregate 生命周期转移的消息集合。"
  },
  "aggregate.emitted_messages": {
    label: "发出的消息",
    description: "该 aggregate 在转移过程中会发出的消息集合。"
  },
  "aggregate.reachable_states": {
    label: "可达状态",
    description: "可从初始状态通过合法转移到达的状态集合。"
  },
  "aggregate.unreachable_states": {
    label: "不可达状态",
    description: "当前生命周期里尚不可达的状态集合。"
  },
  "aggregate.state.id": {
    label: "状态",
    description: "当前聚合所处的生命周期状态。"
  },
  "aggregate.state.reachable": {
    label: "可达",
    description: "表示该状态是否能从初始状态通过合法转移到达。"
  },
  "aggregate.state.outgoing_messages": {
    label: "出站消息",
    description: "从当前状态出发可能触发的生命周期转移所发出的消息集合。"
  },
  "transition.trigger_message": {
    label: "触发消息",
    description: "触发当前生命周期转移的消息。"
  },
  "transition.emitted_messages": {
    label: "发出的消息",
    description: "当前生命周期转移会额外发出的消息集合。"
  },
  "relation.from": {
    label: "起点",
    description: "转移或关系的起点状态、起始步骤或来源节点。"
  },
  "relation.to": {
    label: "终点",
    description: "转移或关系的目标状态、目标步骤或去向节点。"
  },
  "policy.id": {
    label: "策略",
    description: "当前协调策略或 saga 的标识。"
  },
  "policy.context": {
    label: "上下文",
    description: "当前 policy 所属或声明的业务 context。"
  },
  "policy.trigger_messages": {
    label: "触发消息",
    description: "会触发该 policy 运行的消息集合。"
  },
  "policy.emitted_messages": {
    label: "发出的消息",
    description: "该 policy 继续向外发出的消息集合。"
  },
  "policy.target_systems": {
    label: "目标系统",
    description: "该 policy 会调用或协调的目标系统。"
  },
  "policy.related_contexts": {
    label: "相关上下文",
    description: "该 policy 触达或协调到的 context 集合。"
  },
  "policy.coordinates": {
    label: "协调对象",
    description: "该 policy 显式协调的业务资源集合。"
  }
} satisfies Record<ViewerSemanticKey, ViewerSemanticDefinition>;

interface ViewerProjectionCopy {
  detailSemantics: Readonly<Record<ViewerSemanticKey, ViewerSemanticDefinition>>;
  edgeLabels: Readonly<{
    owns: string;
    participates: string;
    touches: string;
    source: string;
    target: string;
    feeds: string;
    triggers: string;
    emits: string;
    next: string;
  }>;
  messageVerbs: Readonly<Record<"command" | "event" | "query", string>>;
  recordLabels: Readonly<{
    relationship: string;
    kind: string;
    direction: string;
    integration: string;
    target: string;
    description: string;
    contexts: string;
    scenario: string;
    step: string;
    message: string;
    policy: string;
    sources: string;
    targets: string;
    sourceContexts: string;
    targetContexts: string;
    context: string;
  }>;
  values: Readonly<{
    none: string;
    yes: string;
    no: string;
    unspecified: string;
    internal: string;
    external: string;
    reachable: string;
    unreachable: string;
    terminal: string;
    finalOutcome: string;
    noDescriptionAvailable: string;
    externalHop: string;
  }>;
  views: Readonly<{
    contextMap: {
      title: string;
      description: string;
    };
    scenarioStory: {
      title: string;
      description: string;
    };
    messageFlow: {
      title: string;
      description: string;
    };
    lifecycle: {
      title: string;
      description: string;
    };
    policySaga: {
      title: string;
      description: string;
    };
  }>;
  summaries: Readonly<{
    context: (aggregateCount: number, scenarioCount: number, policyCount: number) => string;
    aggregateInitial: (state: string) => string;
    scenarioGoal: (goal: string) => string;
    policy: (triggerCount: number, emittedCount: number) => string;
    actorContextsSteps: (contextCount: number, stepCount: number) => string;
    actorSteps: (stepCount: number) => string;
    scenarioMessages: (count: number) => string;
    messageFlowContext: (stepCount: number, endpointCount: number) => string;
    messageFlowScenario: (stepCount: number, contextCount: number) => string;
    stepInOut: (incomingCount: number, outgoingCount: number) => string;
    lifecycleTransitions: (transitionCount: number) => string;
    messageTrace: (producerContexts: string, consumerContexts: string) => string;
  }>;
}

interface ViewerEnumCopy {
  actorTypes: Readonly<Record<string, string>>;
  systemBoundaries: Readonly<Record<string, string>>;
  messageKinds: Readonly<Record<string, string>>;
  messageChannels: Readonly<Record<string, string>>;
  relationshipKinds: Readonly<Record<string, string>>;
  relationshipDirections: Readonly<Record<string, string>>;
  relationshipIntegrations: Readonly<Record<string, string>>;
  dependencyKinds: Readonly<Record<string, string>>;
  stepLinkDirections: Readonly<Record<string, string>>;
}

const VIEWER_ENUM_COPY: Record<ViewerLocale, ViewerEnumCopy> = {
  en: {
    actorTypes: {
      person: "person",
      role: "role",
      team: "team"
    },
    systemBoundaries: {
      internal: "internal",
      external: "external"
    },
    messageKinds: {
      command: "command",
      event: "event",
      query: "query"
    },
    messageChannels: {
      sync: "sync",
      async: "async"
    },
    relationshipKinds: {
      "depends-on": "depends-on"
    },
    relationshipDirections: {
      upstream: "upstream",
      downstream: "downstream",
      bidirectional: "bidirectional"
    },
    relationshipIntegrations: {
      "customer-supplier": "customer-supplier",
      partnership: "partnership",
      conformist: "conformist",
      "anti-corruption-layer": "anti-corruption-layer",
      "open-host-service": "open-host-service",
      "published-language": "published-language",
      "shared-kernel": "shared-kernel"
    },
    dependencyKinds: {
      "context-relationship": "context-relationship",
      "scenario-step": "scenario-step",
      "message-producer": "message-producer",
      "message-consumer": "message-consumer",
      "policy-target": "policy-target"
    },
    stepLinkDirections: {
      incoming: "incoming",
      outgoing: "outgoing"
    }
  },
  "zh-CN": {
    actorTypes: {
      person: "个人",
      role: "角色",
      team: "团队"
    },
    systemBoundaries: {
      internal: "内部",
      external: "外部"
    },
    messageKinds: {
      command: "命令",
      event: "事件",
      query: "查询"
    },
    messageChannels: {
      sync: "同步",
      async: "异步"
    },
    relationshipKinds: {
      "depends-on": "依赖"
    },
    relationshipDirections: {
      upstream: "上游",
      downstream: "下游",
      bidirectional: "双向"
    },
    relationshipIntegrations: {
      "customer-supplier": "客户方-供应方",
      partnership: "伙伴协作",
      conformist: "顺应者",
      "anti-corruption-layer": "防腐层",
      "open-host-service": "开放主机服务",
      "published-language": "发布语言",
      "shared-kernel": "共享内核"
    },
    dependencyKinds: {
      "context-relationship": "上下文关系",
      "scenario-step": "场景步骤",
      "message-producer": "消息生产方",
      "message-consumer": "消息消费方",
      "policy-target": "策略目标"
    },
    stepLinkDirections: {
      incoming: "流入",
      outgoing: "流出"
    }
  }
};

const VIEWER_PROJECTION_COPY: Record<ViewerLocale, ViewerProjectionCopy> = {
  en: {
    detailSemantics: VIEWER_DETAIL_SEMANTICS_EN,
    edgeLabels: {
      owns: "owns",
      participates: "participates",
      touches: "touches",
      source: "source",
      target: "target",
      feeds: "feeds",
      triggers: "triggers",
      emits: "emits",
      next: "next"
    },
    messageVerbs: {
      command: "issues",
      event: "publishes",
      query: "asks"
    },
    recordLabels: {
      relationship: "Relationship",
      kind: "Kind",
      direction: "Direction",
      integration: "Integration",
      target: "Target",
      description: "Description",
      contexts: "Contexts",
      scenario: "Scenario",
      step: "Step",
      message: "Message",
      policy: "Policy",
      sources: "Sources",
      targets: "Targets",
      sourceContexts: "Source contexts",
      targetContexts: "Target contexts",
      context: "Context"
    },
    values: {
      none: "none",
      yes: "yes",
      no: "no",
      unspecified: "unspecified",
      internal: "internal",
      external: "external",
      reachable: "reachable",
      unreachable: "unreachable",
      terminal: "terminal",
      finalOutcome: "final outcome",
      noDescriptionAvailable: "No description available.",
      externalHop: "external hop"
    },
    views: {
      contextMap: {
        title: "Context Map",
        description:
          "Shows bounded contexts, the actors and systems they collaborate with, and which scenarios, aggregates, and policies each context owns."
      },
      scenarioStory: {
        title: "Scenario Story",
        description:
          "Shows how each scenario advances step by step across contexts, including which message moves the story forward."
      },
      messageFlow: {
        title: "Message Flow / Trace",
        description:
          "Shows how commands, events, and queries move between contexts, endpoints, and scenario steps, including cross-context hops."
      },
      lifecycle: {
        title: "Lifecycle",
        description:
          "Shows aggregate state transitions, the message that triggers each transition, and which follow-up messages each transition emits."
      },
      policySaga: {
        title: "Policy / Saga",
        description:
          "Shows which messages trigger each coordination policy and which follow-up messages that policy emits."
      }
    },
    summaries: {
      context(aggregateCount, scenarioCount, policyCount) {
        return `${aggregateCount} aggregate(s), ${scenarioCount} scenario(s), ${policyCount} policy(s)`;
      },
      aggregateInitial(state) {
        return `initial: ${state}`;
      },
      scenarioGoal(goal) {
        return `goal: ${goal}`;
      },
      policy(triggerCount, emittedCount) {
        return `${triggerCount} trigger(s), ${emittedCount} emitted`;
      },
      actorContextsSteps(contextCount, stepCount) {
        return `${contextCount} context(s), ${stepCount} step(s)`;
      },
      actorSteps(stepCount) {
        return `${stepCount} step(s)`;
      },
      scenarioMessages(count) {
        return `${count} message(s)`;
      },
      messageFlowContext(stepCount, endpointCount) {
        return `${stepCount} step(s), ${endpointCount} endpoint(s)`;
      },
      messageFlowScenario(stepCount, contextCount) {
        return `${stepCount} step(s), ${contextCount} context(s)`;
      },
      stepInOut(incomingCount, outgoingCount) {
        return `${incomingCount} in, ${outgoingCount} out`;
      },
      lifecycleTransitions(transitionCount) {
        return `${transitionCount} transition(s)`;
      },
      messageTrace(producerContexts, consumerContexts) {
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
    }
  },
  "zh-CN": {
    detailSemantics: VIEWER_DETAIL_SEMANTICS_ZH_CN,
    edgeLabels: {
      owns: "拥有",
      participates: "参与",
      touches: "触达",
      source: "来源",
      target: "目标",
      feeds: "输入到",
      triggers: "触发",
      emits: "发出",
      next: "下一步"
    },
    messageVerbs: {
      command: "发出",
      event: "发布",
      query: "查询"
    },
    recordLabels: {
      relationship: "关系",
      kind: "类型",
      direction: "方向",
      integration: "集成方式",
      target: "目标",
      description: "说明",
      contexts: "上下文",
      scenario: "场景",
      step: "步骤",
      message: "消息",
      policy: "策略",
      sources: "来源",
      targets: "目标",
      sourceContexts: "来源上下文",
      targetContexts: "目标上下文",
      context: "上下文"
    },
    values: {
      none: "无",
      yes: "是",
      no: "否",
      unspecified: "未指定",
      internal: "内部",
      external: "外部",
      reachable: "可达",
      unreachable: "不可达",
      terminal: "终态",
      finalOutcome: "终局结果",
      noDescriptionAvailable: "未提供说明。",
      externalHop: "外部跳转"
    },
    views: {
      contextMap: {
        title: "上下文地图",
        description:
          "展示 bounded context，以及与其协作的参与者和系统，还有每个 context 拥有的场景、聚合与策略。"
      },
      scenarioStory: {
        title: "场景故事",
        description:
          "展示每个场景如何跨 context 逐步推进，以及哪条消息推动故事继续前进。"
      },
      messageFlow: {
        title: "消息流 / 追踪",
        description:
          "展示 command、event 与 query 如何在 context、端点和场景步骤之间流动，包括跨上下文跳转。"
      },
      lifecycle: {
        title: "生命周期",
        description:
          "展示聚合状态迁移、触发每次迁移的消息，以及每次迁移会发出的后续消息。"
      },
      policySaga: {
        title: "策略 / Saga",
        description:
          "展示哪些消息会触发每个协调策略，以及该策略会发出哪些后续消息。"
      }
    },
    summaries: {
      context(aggregateCount, scenarioCount, policyCount) {
        return `${aggregateCount} 个聚合, ${scenarioCount} 个场景, ${policyCount} 个策略`;
      },
      aggregateInitial(state) {
        return `初始状态: ${state}`;
      },
      scenarioGoal(goal) {
        return `目标: ${goal}`;
      },
      policy(triggerCount, emittedCount) {
        return `${triggerCount} 个触发消息, ${emittedCount} 个发出消息`;
      },
      actorContextsSteps(contextCount, stepCount) {
        return `${contextCount} 个上下文, ${stepCount} 个步骤`;
      },
      actorSteps(stepCount) {
        return `${stepCount} 个步骤`;
      },
      scenarioMessages(count) {
        return `${count} 条消息`;
      },
      messageFlowContext(stepCount, endpointCount) {
        return `${stepCount} 个步骤, ${endpointCount} 个端点`;
      },
      messageFlowScenario(stepCount, contextCount) {
        return `${stepCount} 个步骤, ${contextCount} 个上下文`;
      },
      stepInOut(incomingCount, outgoingCount) {
        return `${incomingCount} 入, ${outgoingCount} 出`;
      },
      lifecycleTransitions(transitionCount) {
        return `${transitionCount} 个迁移`;
      },
      messageTrace(producerContexts, consumerContexts) {
        if (producerContexts && consumerContexts) {
          return producerContexts === consumerContexts
            ? producerContexts
            : `${producerContexts} -> ${consumerContexts}`;
        }

        if (producerContexts) {
          return `${producerContexts} -> 外部`;
        }

        if (consumerContexts) {
          return `外部 -> ${consumerContexts}`;
        }

        return "外部跳转";
      }
    }
  }
};

export function getViewerProjectionCopy(locale: ViewerLocale): ViewerProjectionCopy {
  return VIEWER_PROJECTION_COPY[locale] ?? VIEWER_PROJECTION_COPY[DEFAULT_VIEWER_LOCALE];
}

function getViewerEnumCopy(locale: ViewerLocale): ViewerEnumCopy {
  return VIEWER_ENUM_COPY[locale] ?? VIEWER_ENUM_COPY[DEFAULT_VIEWER_LOCALE];
}

function localizeEnumValue(
  locale: ViewerLocale,
  table: Readonly<Record<string, string>>,
  value: string
): string {
  return table[value] ?? value;
}

export function localizeViewerActorType(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).actorTypes, value);
}

export function localizeViewerSystemBoundary(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).systemBoundaries, value);
}

export function localizeViewerMessageKind(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).messageKinds, value);
}

export function localizeViewerMessageChannel(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).messageChannels, value);
}

export function localizeViewerRelationshipKind(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).relationshipKinds, value);
}

export function localizeViewerRelationshipDirection(
  locale: ViewerLocale,
  value: string
): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).relationshipDirections, value);
}

export function localizeViewerRelationshipIntegration(
  locale: ViewerLocale,
  value: string
): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).relationshipIntegrations, value);
}

export function localizeViewerDependencyKind(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).dependencyKinds, value);
}

export function localizeViewerStepLinkDirection(locale: ViewerLocale, value: string): string {
  return localizeEnumValue(locale, getViewerEnumCopy(locale).stepLinkDirections, value);
}
