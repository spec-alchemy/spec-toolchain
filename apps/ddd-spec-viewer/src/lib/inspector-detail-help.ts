import {
  DEFAULT_VIEWER_LOCALE,
  type ViewerLocale
} from "@knowledge-alchemy/ddd-spec-viewer-contract";

const UI_DETAIL_HELP_BY_LOCALE: Readonly<Record<ViewerLocale, Record<string, string>>> = {
  en: {
    "ui.view_question": "Explains the business modeling question this view is designed to answer first.",
    "ui.how_to_read":
      "Explains how to read this view and what appears in the inspector after selecting a node or edge.",
    "ui.details": "Collects the additional details available for the current selection."
  },
  "zh-CN": {
    "ui.view_question": "说明当前视图优先回答的业务建模问题。",
    "ui.how_to_read": "说明当前视图该如何阅读，以及点击节点或边后右侧会展示什么信息。",
    "ui.details": "当前选中项补充信息的集合。"
  }
};

export function getInspectorDetailHelp(
  semanticKey: string,
  semanticDetailHelp: Readonly<Record<string, string>>,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): string {
  const localizedUiDetailHelp =
    UI_DETAIL_HELP_BY_LOCALE[locale] ?? UI_DETAIL_HELP_BY_LOCALE[DEFAULT_VIEWER_LOCALE];

  return (
    semanticDetailHelp[semanticKey] ??
    localizedUiDetailHelp[semanticKey] ??
    (locale === "zh-CN"
      ? `说明当前语义字段 ${semanticKey} 在所选节点或关系中的业务含义。`
      : `Explains what the semantic field ${semanticKey} means for the selected node or relation.`)
  );
}
