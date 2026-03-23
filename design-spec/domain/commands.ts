import type { CommandSpec } from "../types.js";
import { objectIds, type ObjectId } from "./objects.js";

export type ConfirmConnection = {
  type: "confirmConnection";
  connectionId: string;
};

export type ArchiveConnection = {
  type: "archiveConnection";
  connectionId: string;
  reason: string;
};

export type AcceptSuggestedCard = {
  type: "acceptSuggestedCard";
  cardId: string;
};

export type ArchiveCard = {
  type: "archiveCard";
  cardId: string;
  reason: string;
};

export type ConnectionCommand = ConfirmConnection | ArchiveConnection;
export type CardCommand = AcceptSuggestedCard | ArchiveCard;
export type ConnectionCardReviewCommand = ConnectionCommand | CardCommand;

export const commands = [
  {
    type: "confirmConnection",
    target: objectIds.connection,
    description: "将建议连接确认成正式连接。"
  },
  {
    type: "archiveConnection",
    target: objectIds.connection,
    description: "归档建议连接，并在连接阶段提前结束闭环。"
  },
  {
    type: "acceptSuggestedCard",
    target: objectIds.card,
    description: "接受建议卡片，使闭环正常完成。"
  },
  {
    type: "archiveCard",
    target: objectIds.card,
    description: "归档建议卡片，并在卡片阶段提前结束闭环。"
  }
] as const satisfies readonly CommandSpec<ConnectionCardReviewCommand["type"], ObjectId>[];
