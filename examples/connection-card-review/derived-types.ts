import { businessSpec, cardObject, connectionObject, objectIds } from "./index.js";

type GeneratedCommand = (typeof businessSpec.domain.commands)[number];
type GeneratedEvent = (typeof businessSpec.domain.events)[number];
type ConnectionCardReviewProcessDefinition = Extract<
  (typeof businessSpec.domain.processes)[number],
  { id: "connectionCardReviewProcess" }
>;

type GeneratedField = {
  id: string;
  required: boolean;
};

type Simplify<Value> = {
  [Key in keyof Value]: Value[Key];
};

type FieldShape<Fields extends readonly GeneratedField[]> = Simplify<
  {
    [Field in Fields[number] as Field["required"] extends true ? Field["id"] : never]: string;
  } & {
    [Field in Fields[number] as Field["required"] extends false ? Field["id"] : never]?: string;
  }
>;

type MessageFromSpec<Item> = Item extends {
  type: string;
  payload: {
    fields: readonly GeneratedField[];
  };
}
  ? Simplify<
      {
        type: Item["type"];
      } & FieldShape<Item["payload"]["fields"]>
    >
  : never;

type FinalOutcomeFromStages<Stages> = Stages extends Record<string, infer Stage>
  ? Extract<
      Stage,
      {
        final: true;
        outcome: string;
      }
    >["outcome"]
  : never;

export type ObjectId = (typeof objectIds)[keyof typeof objectIds];
export type ConnectionLifecycle = (typeof connectionObject.lifecycle)[number];
export type CardLifecycle = (typeof cardObject.lifecycle)[number];

export type ConfirmConnection = MessageFromSpec<
  Extract<GeneratedCommand, { type: "confirmConnection" }>
>;

export type ArchiveConnection = MessageFromSpec<
  Extract<GeneratedCommand, { type: "archiveConnection" }>
>;

export type AcceptSuggestedCard = MessageFromSpec<
  Extract<GeneratedCommand, { type: "acceptSuggestedCard" }>
>;

export type ArchiveCard = MessageFromSpec<Extract<GeneratedCommand, { type: "archiveCard" }>>;

export type ConnectionCommand = ConfirmConnection | ArchiveConnection;
export type CardCommand = AcceptSuggestedCard | ArchiveCard;
export type ConnectionCardReviewCommand = MessageFromSpec<GeneratedCommand>;

export type ConnectionConfirmed = MessageFromSpec<
  Extract<GeneratedEvent, { type: "ConnectionConfirmed" }>
>;

export type ConnectionArchived = MessageFromSpec<
  Extract<GeneratedEvent, { type: "ConnectionArchived" }>
>;

export type CardAccepted = MessageFromSpec<Extract<GeneratedEvent, { type: "CardAccepted" }>>;
export type CardArchived = MessageFromSpec<Extract<GeneratedEvent, { type: "CardArchived" }>>;

export type ConnectionDomainEvent = ConnectionConfirmed | ConnectionArchived;
export type CardDomainEvent = CardAccepted | CardArchived;
export type ConnectionCardReviewDomainEvent = MessageFromSpec<GeneratedEvent>;

type ConnectionCardReviewStages = ConnectionCardReviewProcessDefinition["stages"];

export type ConnectionCardReviewStage = keyof ConnectionCardReviewStages;
export type ConnectionCardReviewOutcome = FinalOutcomeFromStages<ConnectionCardReviewStages>;
