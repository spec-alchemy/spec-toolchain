import type { DomainEventSpec } from "../types.js";
import { objectIds, type ObjectId } from "./objects.js";

export type ConnectionConfirmed = {
  type: "ConnectionConfirmed";
  connectionId: string;
};

export type ConnectionArchived = {
  type: "ConnectionArchived";
  connectionId: string;
  reason: string;
};

export type CardAccepted = {
  type: "CardAccepted";
  cardId: string;
};

export type CardArchived = {
  type: "CardArchived";
  cardId: string;
  reason: string;
};

export type ConnectionDomainEvent = ConnectionConfirmed | ConnectionArchived;
export type CardDomainEvent = CardAccepted | CardArchived;
export type ConnectionCardReviewDomainEvent = ConnectionDomainEvent | CardDomainEvent;

export const events = [
  {
    type: "ConnectionConfirmed",
    source: objectIds.connection,
    description: "连接聚合已从 suggested 进入 confirmed。"
  },
  {
    type: "ConnectionArchived",
    source: objectIds.connection,
    description: "连接聚合已从 suggested 进入 archived。"
  },
  {
    type: "CardAccepted",
    source: objectIds.card,
    description: "卡片聚合已从 suggested 进入 accepted。"
  },
  {
    type: "CardArchived",
    source: objectIds.card,
    description: "卡片聚合已从 suggested 进入 archived。"
  }
] as const satisfies readonly DomainEventSpec<
  ConnectionCardReviewDomainEvent["type"],
  ObjectId
>[];
