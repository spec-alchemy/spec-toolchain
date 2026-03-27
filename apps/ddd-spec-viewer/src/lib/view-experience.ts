import type {
  BusinessViewerSpec,
  ViewerViewKind,
  ViewerViewSpec
} from "@/types";

interface ViewerViewCopy {
  defaultTitle: string;
  question: string;
  overview: string;
  howToRead: string;
}

export interface ViewerViewExperience {
  id: string;
  kind: ViewerViewKind;
  title: string;
  tier: ViewerViewSpec["navigation"]["tier"];
  order: number;
  isDefault: boolean;
  question: string;
  overview: string;
  howToRead: string;
}

interface ViewerViewSeed {
  id: string;
  kind: ViewerViewKind;
  title: string;
  tier: ViewerViewSpec["navigation"]["tier"];
  order: number;
  isDefault?: boolean;
}

const VIEW_COPY_BY_KIND: Readonly<Record<ViewerViewKind, ViewerViewCopy>> = {
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
};

const DEFAULT_VIEW_SEEDS: readonly ViewerViewSeed[] = [
  {
    id: "context-map",
    kind: "context-map",
    title: VIEW_COPY_BY_KIND["context-map"].defaultTitle,
    tier: "primary",
    order: 10,
    isDefault: true
  },
  {
    id: "scenario-story",
    kind: "scenario-story",
    title: VIEW_COPY_BY_KIND["scenario-story"].defaultTitle,
    tier: "primary",
    order: 20
  },
  {
    id: "message-flow",
    kind: "message-flow",
    title: VIEW_COPY_BY_KIND["message-flow"].defaultTitle,
    tier: "primary",
    order: 30
  },
  {
    id: "lifecycle",
    kind: "lifecycle",
    title: VIEW_COPY_BY_KIND.lifecycle.defaultTitle,
    tier: "primary",
    order: 40
  }
];

export function getViewExperience(
  view: Pick<ViewerViewSpec, "id" | "kind" | "title" | "navigation">
): ViewerViewExperience {
  return buildViewExperience({
    id: view.id,
    kind: view.kind,
    title: view.title,
    tier: view.navigation.tier,
    order: view.navigation.order,
    isDefault: view.navigation.default
  });
}

export function getViewerNavigationExperience(
  viewerSpec: BusinessViewerSpec | null
): {
  primary: readonly ViewerViewExperience[];
  secondary: readonly ViewerViewExperience[];
} {
  const views = viewerSpec
    ? viewerSpec.views.map((view) => getViewExperience(view))
    : DEFAULT_VIEW_SEEDS.map((view) => buildViewExperience(view));
  const orderedViews = [...views].sort((left, right) => left.order - right.order);

  return {
    primary: orderedViews.filter((view) => view.tier === "primary"),
    secondary: orderedViews.filter((view) => view.tier === "secondary")
  };
}

export function getSelectedViewExperience(
  viewerSpec: BusinessViewerSpec | null,
  selectedViewId: string
): ViewerViewExperience | null {
  const navigation = getViewerNavigationExperience(viewerSpec);
  const allViews = [...navigation.primary, ...navigation.secondary];

  return (
    allViews.find((view) => view.id === selectedViewId) ??
    allViews.find((view) => view.isDefault) ??
    allViews[0] ??
    null
  );
}

export function getPrimaryModelingFlow(viewerSpec: BusinessViewerSpec | null): string {
  const primaryViews = getViewerNavigationExperience(viewerSpec).primary;
  const orderedPrimaryViews =
    primaryViews.length > 0
      ? primaryViews
      : DEFAULT_VIEW_SEEDS.map((view) => buildViewExperience(view));

  return orderedPrimaryViews.map((view) => view.title).join(" -> ");
}

function buildViewExperience(seed: ViewerViewSeed): ViewerViewExperience {
  const copy = VIEW_COPY_BY_KIND[seed.kind];

  return {
    id: seed.id,
    kind: seed.kind,
    title: seed.title || copy.defaultTitle,
    tier: seed.tier,
    order: seed.order,
    isDefault: seed.isDefault ?? false,
    question: copy.question,
    overview: copy.overview,
    howToRead: copy.howToRead
  };
}
