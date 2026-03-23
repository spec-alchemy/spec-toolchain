import {
  cardAggregate,
  cardAggregateAccepts,
  cardAggregateEmits
} from "./card.aggregate.js";
import {
  connectionAggregate,
  connectionAggregateAccepts,
  connectionAggregateEmits
} from "./connection.aggregate.js";

export {
  cardAggregate,
  cardAggregateAccepts,
  cardAggregateEmits,
  connectionAggregate,
  connectionAggregateAccepts,
  connectionAggregateEmits
};

export const aggregates = [connectionAggregate, cardAggregate] as const;
