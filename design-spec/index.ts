import type { DesignSpec } from "./types.js";
import { aggregates, commands, events, objects, processes } from "./domain/index.js";
import {
  cardMachine,
  connectionMachine,
  connectionCardReviewSystem
} from "./state/index.js";

export {
  aggregates,
  cardAggregate,
  commands,
  connectionAggregate,
  events,
  objects,
  objectIds,
  processes,
  connectionCardReviewProcess
} from "./domain/index.js";
export type {
  CardCommand,
  ConnectionCardReviewCommand,
  ConnectionCardReviewDomainEvent,
  ConnectionCardReviewOutcome,
  ConnectionCardReviewStage,
  ConnectionCommand,
} from "./domain/index.js";
export { cardMachine, connectionMachine, connectionCardReviewSystem } from "./state/index.js";
export type { DesignSpec } from "./types.js";

export const connectionCardReviewSpec = {
  title: "建议 Connection -> 建议 Card 审核闭环",
  summary: "最小审核闭环：先审核建议连接，再审核其衍生建议卡片，形成一条正常完成路径和两条提前结束路径。",
  domain: {
    objects,
    commands,
    events,
    aggregates,
    processes
  },
  state: {
    machines: [connectionMachine, cardMachine],
    system: connectionCardReviewSystem
  }
} as const satisfies DesignSpec;
