import {
  DEFAULT_VIEWER_LOCALE,
  type ViewerLocale,
  type ViewerViewKind
} from "@knowledge-alchemy/ddd-spec-viewer-contract";

interface ViewerHeaderCopy {
  workspaceLabel: string;
  titleFallback: string;
  summaryFallback: string;
  defaultEntryLabel: string;
  primaryModelingFlowLabel: string;
  viewerArtifactLabel: string;
  viewSelectorLabel: string;
  primaryMapLabel: string;
  secondaryMapLabel: string;
  selectViewFallback: string;
  selectViewPrompt: string;
  primaryMapsGroupLabel: string;
  secondaryMapsGroupLabel: string;
  selectedViewQuestionLabel: string;
  languageLabel: string;
  viewerLanguageLabel: string;
  systemLanguageLabel: string;
  reloadViewerLabel: string;
  localeLabels: Readonly<Record<ViewerLocale, string>>;
  primaryTourLabel: (index: number) => string;
}

export interface ViewerViewCopy {
  defaultTitle: string;
  question: string;
  overview: string;
  howToRead: string;
}

interface ViewerSystemCopy {
  header: ViewerHeaderCopy;
  localeFallbackNotice: (options: {
    locale: ViewerLocale;
    requestedLabel: string;
    fallbackLabel: string;
  }) => string;
  views: Readonly<Record<ViewerViewKind, ViewerViewCopy>>;
}

const VIEWER_LOCALE_LABELS: Readonly<Record<ViewerLocale, string>> = {
  en: "English",
  "zh-CN": "中文"
};

const VIEWER_SYSTEM_COPY: Readonly<Record<ViewerLocale, ViewerSystemCopy>> = {
  en: {
    header: {
      workspaceLabel: "Domain Model Workspace",
      titleFallback: "DDD Spec Viewer",
      summaryFallback:
        "Open a generated domain model workspace to inspect boundaries, stories, messages, and lifecycle decisions as one modeling flow.",
      defaultEntryLabel: "Default entry",
      primaryModelingFlowLabel: "Primary modeling flow",
      viewerArtifactLabel: "Viewer artifact",
      viewSelectorLabel: "View Selector",
      primaryMapLabel: "Primary map",
      secondaryMapLabel: "Secondary map",
      selectViewFallback: "Select a view",
      selectViewPrompt: "Choose a map to inspect the modeled business story.",
      primaryMapsGroupLabel: "Primary maps",
      secondaryMapsGroupLabel: "Secondary maps",
      selectedViewQuestionLabel: "This map answers:",
      languageLabel: "Language",
      viewerLanguageLabel: "Viewer language",
      systemLanguageLabel: "System language",
      reloadViewerLabel: "Reload Viewer",
      localeLabels: VIEWER_LOCALE_LABELS,
      primaryTourLabel: (index) => `Primary ${index}`
    },
    localeFallbackNotice: ({ locale, requestedLabel, fallbackLabel }) =>
      `Localized viewer artifact unavailable for ${locale} (${requestedLabel}). Showing ${fallbackLabel} instead.`,
    views: {
      "context-map": {
        defaultTitle: "Context Map",
        question: "Where are the business boundaries, and who collaborates across them?",
        overview:
          "Start here to identify bounded contexts, ownership boundaries, and the actors or systems each context works with.",
        howToRead:
          "Read each context as an ownership boundary, then inspect the surrounding actors, systems, and collaboration edges to see who depends on whom."
      },
      "scenario-story": {
        defaultTitle: "Scenario Story",
        question: "How does the business story move from trigger to outcome?",
        overview:
          "Use this map to follow the default business narrative step by step across contexts.",
        howToRead:
          "Start at the entry step, follow sequence edges, and inspect each step to see the acting role, touched context, and resulting outcome."
      },
      "message-flow": {
        defaultTitle: "Message Flow / Trace",
        question:
          "Which commands, events, and queries move work between steps, contexts, and systems?",
        overview:
          "Use this map to trace the contracts that request work, report facts, and hand business work across boundaries.",
        howToRead:
          "Inspect a message to see its source, target, and scenario links, then follow message-flow edges to understand where contracts cross context boundaries."
      },
      lifecycle: {
        defaultTitle: "Lifecycle",
        question: "How does a core aggregate change state over time?",
        overview:
          "Focus here when you need the state machine behind the business story and message flow.",
        howToRead:
          "Read each aggregate as a lifecycle, then inspect states and transitions to see trigger messages, emitted follow-up work, and valid business progression."
      },
      "domain-structure": {
        defaultTitle: "Domain Structure",
        question: "What lives inside each aggregate boundary, and what is shared outside it?",
        overview:
          "Use this secondary map to inspect fields, owned objects, shared types, and structural references.",
        howToRead:
          "Start from an aggregate root, then follow composition, association, and reference edges to understand structural ownership and shared dependencies."
      },
      "policy-saga": {
        defaultTitle: "Policy / Saga",
        question: "Which policies coordinate follow-up work after a message arrives?",
        overview:
          "Use this secondary map to inspect coordination logic, follow-up messages, and external system handoffs.",
        howToRead:
          "Read from trigger messages into policy nodes, then follow outgoing messages and target systems to understand orchestration responsibilities."
      }
    }
  },
  "zh-CN": {
    header: {
      workspaceLabel: "领域模型工作区",
      titleFallback: "DDD Spec 查看器",
      summaryFallback:
        "打开已生成的领域模型工作区，在一条建模主线上查看边界、故事、消息以及生命周期决策。",
      defaultEntryLabel: "默认入口",
      primaryModelingFlowLabel: "主建模路径",
      viewerArtifactLabel: "Viewer 产物",
      viewSelectorLabel: "视图切换",
      primaryMapLabel: "主视图",
      secondaryMapLabel: "次级视图",
      selectViewFallback: "选择一个视图",
      selectViewPrompt: "选择一个视图以检查当前建模业务故事。",
      primaryMapsGroupLabel: "主视图",
      secondaryMapsGroupLabel: "次级视图",
      selectedViewQuestionLabel: "当前视图回答：",
      languageLabel: "语言",
      viewerLanguageLabel: "Viewer 语言",
      systemLanguageLabel: "系统语言",
      reloadViewerLabel: "重新加载 Viewer",
      localeLabels: VIEWER_LOCALE_LABELS,
      primaryTourLabel: (index) => `主视图 ${index}`
    },
    localeFallbackNotice: ({ locale, requestedLabel, fallbackLabel }) =>
      `未找到 ${locale} 对应的本地化 viewer 产物（${requestedLabel}），当前改为显示 ${fallbackLabel}。`,
    views: {
      "context-map": {
        defaultTitle: "上下文地图",
        question: "业务边界在哪里，哪些参与方在这些边界之间协作？",
        overview:
          "从这里开始识别 bounded context、责任边界，以及每个 context 关联的参与者或系统。",
        howToRead:
          "先把每个 context 当作责任边界来阅读，再查看周围的参与者、系统与协作连线，理解谁依赖谁。"
      },
      "scenario-story": {
        defaultTitle: "场景故事",
        question: "业务故事如何从触发推进到结果？",
        overview:
          "用这张图按步骤跟随默认业务叙事，观察它如何跨 context 推进。",
        howToRead:
          "从入口步骤开始，沿着顺序连线阅读，并查看每个步骤中的执行角色、涉及 context 与产出结果。"
      },
      "message-flow": {
        defaultTitle: "消息流 / 追踪",
        question: "哪些 command、event 和 query 在步骤、context 与系统之间传递工作？",
        overview:
          "用这张图追踪请求工作、报告事实以及跨边界传递业务工作的契约。",
        howToRead:
          "查看消息的来源、目标与场景关联，再沿着消息流连线理解契约在 context 边界之间如何流动。"
      },
      lifecycle: {
        defaultTitle: "生命周期",
        question: "核心聚合如何随时间发生状态变化？",
        overview:
          "当你需要理解业务故事和消息流背后的状态机时，先看这里。",
        howToRead:
          "把每个聚合当作一条生命周期来阅读，再查看状态与迁移，理解触发消息、发出的后续工作以及合法的业务推进。"
      },
      "domain-structure": {
        defaultTitle: "领域结构",
        question: "每个聚合边界内包含什么，边界外共享什么？",
        overview:
          "用这张次级视图检查字段、自有对象、共享类型和结构引用。",
        howToRead:
          "从聚合根开始，再沿着组合、关联和引用连线理解结构所有权与共享依赖。"
      },
      "policy-saga": {
        defaultTitle: "策略 / Saga",
        question: "消息到达后，哪些策略负责协调后续工作？",
        overview:
          "用这张次级视图检查协调逻辑、后续消息以及与外部系统的交接。",
        howToRead:
          "从触发消息进入策略节点，再沿着发出的消息和目标系统理解编排职责。"
      }
    }
  }
};

export function getViewerHeaderCopy(locale: ViewerLocale): ViewerHeaderCopy {
  return getViewerSystemCopy(locale).header;
}

export function getViewerViewCopy(
  locale: ViewerLocale,
  kind: ViewerViewKind
): ViewerViewCopy {
  return getViewerSystemCopy(locale).views[kind];
}

export function formatViewerLocaleFallbackNotice(options: {
  locale: ViewerLocale;
  requestedLabel: string;
  fallbackLabel: string;
}): string {
  return getViewerSystemCopy(options.locale).localeFallbackNotice(options);
}

function getViewerSystemCopy(locale: ViewerLocale): ViewerSystemCopy {
  return VIEWER_SYSTEM_COPY[locale] ?? VIEWER_SYSTEM_COPY[DEFAULT_VIEWER_LOCALE];
}
