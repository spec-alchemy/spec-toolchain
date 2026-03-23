import type { ProcessSpec } from "../../types.js";
import type { ConnectionCardReviewCommand } from "../commands.js";
import type { ConnectionCardReviewDomainEvent } from "../events.js";

export type ConnectionCardReviewOutcome =
  | "connectionArchived"
  | "cardArchived"
  | "cardAccepted";

// key 是流程阶段名；advancesOn 表示“观察到某个领域事件后，流程推进到哪个阶段”。
const connectionCardReviewStages = {
  awaitingConnectionReview: {
    title: "等待连接审核",
    accepts: ["confirmConnection", "archiveConnection"],
    advancesOn: {
      ConnectionConfirmed: "awaitingCardReview",
      ConnectionArchived: "closedConnectionArchived"
    }
  },
  awaitingCardReview: {
    title: "等待卡片审核",
    accepts: ["acceptSuggestedCard", "archiveCard"],
    advancesOn: {
      CardAccepted: "closedCardAccepted",
      CardArchived: "closedCardArchived"
    }
  },
  closedConnectionArchived: {
    title: "连接阶段已归档关闭",
    final: true,
    outcome: "connectionArchived"
  },
  closedCardArchived: {
    title: "卡片阶段已归档关闭",
    final: true,
    outcome: "cardArchived"
  },
  closedCardAccepted: {
    title: "卡片阶段已接受关闭",
    final: true,
    outcome: "cardAccepted"
  }
} as const;

export type ConnectionCardReviewStage = keyof typeof connectionCardReviewStages;

export const connectionCardReviewProcess = {
  id: "connectionCardReviewProcess",
  title: "建议 Connection -> 建议 Card 审核闭环",
  initialStage: "awaitingConnectionReview",
  stages: connectionCardReviewStages
} as const satisfies ProcessSpec<
  "connectionCardReviewProcess",
  ConnectionCardReviewStage,
  ConnectionCardReviewCommand["type"],
  ConnectionCardReviewDomainEvent["type"],
  ConnectionCardReviewOutcome
>;

export const processes = [connectionCardReviewProcess] as const;
