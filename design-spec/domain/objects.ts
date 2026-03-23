import type { DomainObjectSpec } from "../types.js";

export const objectIds = {
  connection: "Connection",
  card: "Card"
} as const;

export type ObjectId = (typeof objectIds)[keyof typeof objectIds];

export const connectionLifecycle = ["suggested", "confirmed", "archived"] as const;
export type ConnectionLifecycle = (typeof connectionLifecycle)[number];

export const cardLifecycle = ["suggested", "accepted", "archived"] as const;
export type CardLifecycle = (typeof cardLifecycle)[number];

export const connectionObject = {
  id: objectIds.connection,
  title: "Connection",
  lifecycleField: "status",
  lifecycle: connectionLifecycle,
  fields: [
    { id: "connectionId", type: "uuid", required: true, description: "连接唯一标识。" },
    { id: "sourceId", type: "uuid", required: true, description: "源节点 ID。" },
    { id: "targetId", type: "uuid", required: true, description: "目标节点 ID。" },
    { id: "insight", type: "text", required: true, description: "连接的核心洞察。" },
    { id: "status", type: "ConnectionStatus", required: true, description: "连接生命周期字段。" }
  ]
} as const satisfies DomainObjectSpec<typeof objectIds.connection, ConnectionLifecycle>;

export const cardObject = {
  id: objectIds.card,
  title: "Card",
  lifecycleField: "status",
  lifecycle: cardLifecycle,
  fields: [
    { id: "cardId", type: "uuid", required: true, description: "卡片唯一标识。" },
    { id: "connectionId", type: "uuid", required: true, description: "来源连接 ID。" },
    { id: "front", type: "text", required: true, description: "卡片正面内容。" },
    { id: "back", type: "text", required: true, description: "卡片背面内容。" },
    { id: "status", type: "CardStatus", required: true, description: "卡片生命周期字段。" }
  ]
} as const satisfies DomainObjectSpec<typeof objectIds.card, CardLifecycle>;

export const objects = [connectionObject, cardObject] as const;
