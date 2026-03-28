import { DEFAULT_VIEWER_LOCALE } from "@knowledge-alchemy/ddd-spec-viewer-contract";
import type {
  BusinessViewerSpec,
  ViewerLocale,
  ViewerViewKind,
  ViewerViewSpec
} from "@/types";
import { getViewerViewCopy } from "./viewer-system-copy";

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

const DEFAULT_VIEW_SEEDS: readonly ViewerViewSeed[] = [
  {
    id: "context-map",
    kind: "context-map",
    title: "",
    tier: "primary",
    order: 10,
    isDefault: true
  },
  {
    id: "scenario-story",
    kind: "scenario-story",
    title: "",
    tier: "primary",
    order: 20
  },
  {
    id: "message-flow",
    kind: "message-flow",
    title: "",
    tier: "primary",
    order: 30
  },
  {
    id: "lifecycle",
    kind: "lifecycle",
    title: "",
    tier: "primary",
    order: 40
  }
];

export function getViewExperience(
  view: Pick<ViewerViewSpec, "id" | "kind" | "title" | "navigation">,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): ViewerViewExperience {
  return buildViewExperience({
    id: view.id,
    kind: view.kind,
    title: view.title,
    tier: view.navigation.tier,
    order: view.navigation.order,
    isDefault: view.navigation.default
  }, locale);
}

export function getViewerNavigationExperience(
  viewerSpec: BusinessViewerSpec | null,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): {
  primary: readonly ViewerViewExperience[];
  secondary: readonly ViewerViewExperience[];
} {
  const views = viewerSpec
    ? viewerSpec.views.map((view) => getViewExperience(view, locale))
    : DEFAULT_VIEW_SEEDS.map((view) => buildViewExperience(view, locale));
  const orderedViews = [...views].sort((left, right) => left.order - right.order);

  return {
    primary: orderedViews.filter((view) => view.tier === "primary"),
    secondary: orderedViews.filter((view) => view.tier === "secondary")
  };
}

export function getSelectedViewExperience(
  viewerSpec: BusinessViewerSpec | null,
  selectedViewId: string,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): ViewerViewExperience | null {
  const navigation = getViewerNavigationExperience(viewerSpec, locale);
  const allViews = [...navigation.primary, ...navigation.secondary];

  return (
    allViews.find((view) => view.id === selectedViewId) ??
    allViews.find((view) => view.isDefault) ??
    allViews[0] ??
    null
  );
}

export function getPrimaryModelingFlow(
  viewerSpec: BusinessViewerSpec | null,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): string {
  const primaryViews = getViewerNavigationExperience(viewerSpec, locale).primary;
  const orderedPrimaryViews =
    primaryViews.length > 0
      ? primaryViews
      : DEFAULT_VIEW_SEEDS.map((view) => buildViewExperience(view, locale));

  return orderedPrimaryViews.map((view) => view.title).join(" -> ");
}

function buildViewExperience(
  seed: ViewerViewSeed,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): ViewerViewExperience {
  const copy = getViewerViewCopy(locale, seed.kind);

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
