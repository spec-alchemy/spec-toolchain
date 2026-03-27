// UI-owned helper copy stays in the app. Business semantic help comes from generated viewer spec.
const UI_DETAIL_HELP_BY_KEY: Record<string, string> = {
  "ui.view_question": "说明当前视图优先回答的业务建模问题。",
  "ui.how_to_read": "说明当前视图该如何阅读，以及点击节点或边后右侧会展示什么信息。",
  "ui.details": "当前选中项补充信息的集合。"
};

export function getInspectorDetailHelp(
  semanticKey: string,
  semanticDetailHelp: Readonly<Record<string, string>>
): string {
  return (
    semanticDetailHelp[semanticKey] ??
    UI_DETAIL_HELP_BY_KEY[semanticKey] ??
    `说明当前语义字段 ${semanticKey} 在所选节点或关系中的业务含义。`
  );
}
