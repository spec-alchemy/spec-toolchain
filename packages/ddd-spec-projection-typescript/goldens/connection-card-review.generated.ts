// This file is auto-generated. Do not edit by hand.

export const businessSpec = {
  "version": 1,
  "id": "connection-card-review",
  "title": "建议 Connection -> 建议 Card 审核闭环",
  "summary": "最小审核闭环：先审核建议连接，再审核其衍生建议卡片，形成一条正常完成路径和两条提前结束路径。",
  "vocabulary": {
    "viewerDetails": {
      "process.id": {
        "label": "Process",
        "description": "当前业务流程的标识或名称，用来区分不同的流程编排。"
      },
      "process.initial_stage": {
        "label": "Initial stage",
        "description": "流程启动时首先进入的阶段。"
      },
      "process.final_stages": {
        "label": "Final stages",
        "description": "流程可以合法结束的阶段集合。"
      },
      "process.used_aggregates": {
        "label": "Used aggregates",
        "description": "这个流程在运行中会引用或驱动的聚合列表。"
      },
      "stage.id": {
        "label": "Stage",
        "description": "当前阶段在流程定义中的标识。"
      },
      "stage.final": {
        "label": "Final",
        "description": "标记该阶段是否为流程终局阶段。"
      },
      "aggregate.id": {
        "label": "Aggregate",
        "description": "当前节点或关系所属的聚合对象。"
      },
      "aggregate.state.id": {
        "label": "State",
        "description": "当前聚合所处的生命周期状态。"
      },
      "behavior.accepted_commands": {
        "label": "Accepted commands",
        "description": "当前阶段或状态允许接收并处理的命令集合。"
      },
      "behavior.observed_events": {
        "label": "Observed events",
        "description": "当前阶段会监听，并可能触发推进的事件集合。"
      },
      "stage.outcome": {
        "label": "Outcome",
        "description": "当流程走到终局阶段时，对业务结果的简短说明。"
      },
      "aggregate.lifecycle_field": {
        "label": "Lifecycle field",
        "description": "对象上承载生命周期状态的字段名。"
      },
      "aggregate.lifecycle": {
        "label": "Lifecycle",
        "description": "该聚合定义的全部生命周期状态集合。"
      },
      "aggregate.referenced_by_stages": {
        "label": "Referenced by stages",
        "description": "哪些流程阶段会绑定或引用当前聚合或状态。"
      },
      "aggregate.state.emitted_events": {
        "label": "Emitted events",
        "description": "在当前状态完成某次转移后会发出的事件集合。"
      },
      "aggregate.state.bound_by_stages": {
        "label": "Bound by stages",
        "description": "哪些流程阶段明确绑定到了当前聚合状态。"
      },
      "event.type": {
        "label": "Event",
        "description": "系统中发生的业务事实，通常由命令处理后发出。"
      },
      "relation.from": {
        "label": "From",
        "description": "转移或关系的起点状态或起始阶段。"
      },
      "relation.to": {
        "label": "To",
        "description": "转移或关系的目标状态或目标阶段。"
      },
      "relation.label": {
        "label": "Relation",
        "description": "当前关系节点或边代表的业务关系语义。"
      },
      "relation.kind": {
        "label": "Kind",
        "description": "关系的类别，例如 binding、transition、advance。"
      },
      "aggregate.initial_state": {
        "label": "Initial state",
        "description": "聚合生命周期开始时的默认状态。"
      },
      "aggregate.state.reachable": {
        "label": "Reachable",
        "description": "表示该状态是否能从初始状态通过合法转移到达。"
      },
      "aggregate.state.outgoing_commands": {
        "label": "Outgoing commands",
        "description": "从当前状态出发可触发的命令集合。"
      },
      "command.type": {
        "label": "Command",
        "description": "驱动状态变化的业务意图或动作。"
      },
      "transition.payload_mapping": {
        "label": "Payload mapping",
        "description": "命令输入如何映射到发出事件的 payload 字段。"
      },
      "command.target_aggregate": {
        "label": "Target aggregate",
        "description": "命令最终会作用到的聚合对象。"
      },
      "command.payload_fields": {
        "label": "Payload fields",
        "description": "这个命令要求的 payload 字段，以及每个字段的语义说明。"
      },
      "entity.description": {
        "label": "Description",
        "description": "对当前命令或事件语义的简短自然语言说明。"
      },
      "transition.from_state": {
        "label": "From state",
        "description": "命令生效前，聚合所处的来源状态。"
      },
      "transition.to_state": {
        "label": "To state",
        "description": "命令完成后，聚合会进入的目标状态。"
      },
      "event.source_aggregate": {
        "label": "Source aggregate",
        "description": "该事件由哪个聚合发出。"
      },
      "event.payload_fields": {
        "label": "Payload fields",
        "description": "这个事件 payload 中包含的字段，以及每个字段的语义说明。"
      },
      "event.observed_by_stage": {
        "label": "Observed by stage",
        "description": "当前流程阶段是否显式监听这个事件。"
      },
      "event.advances_to": {
        "label": "Advances to",
        "description": "这个事件一旦被流程观察到，会推进到的下一个阶段。"
      },
      "event.target_stage": {
        "label": "Target stage",
        "description": "事件推进后到达的目标阶段。"
      }
    }
  },
  "domain": {
    "objects": [
      {
        "kind": "object",
        "id": "Connection",
        "title": "Connection",
        "lifecycleField": "status",
        "lifecycle": [
          "suggested",
          "confirmed",
          "archived"
        ],
        "fields": [
          {
            "id": "connectionId",
            "type": "uuid",
            "required": true,
            "description": "连接唯一标识。"
          },
          {
            "id": "sourceId",
            "type": "uuid",
            "required": true,
            "description": "源节点 ID。"
          },
          {
            "id": "targetId",
            "type": "uuid",
            "required": true,
            "description": "目标节点 ID。"
          },
          {
            "id": "insight",
            "type": "text",
            "required": true,
            "description": "连接的核心洞察。"
          },
          {
            "id": "status",
            "type": "ConnectionStatus",
            "required": true,
            "description": "连接生命周期字段。"
          }
        ]
      },
      {
        "kind": "object",
        "id": "Card",
        "title": "Card",
        "lifecycleField": "status",
        "lifecycle": [
          "suggested",
          "accepted",
          "archived"
        ],
        "fields": [
          {
            "id": "cardId",
            "type": "uuid",
            "required": true,
            "description": "卡片唯一标识。"
          },
          {
            "id": "connectionId",
            "type": "uuid",
            "required": true,
            "description": "来源连接 ID。"
          },
          {
            "id": "front",
            "type": "text",
            "required": true,
            "description": "卡片正面内容。"
          },
          {
            "id": "back",
            "type": "text",
            "required": true,
            "description": "卡片背面内容。"
          },
          {
            "id": "status",
            "type": "CardStatus",
            "required": true,
            "description": "卡片生命周期字段。"
          }
        ]
      }
    ],
    "commands": [
      {
        "kind": "command",
        "type": "confirmConnection",
        "target": "Connection",
        "description": "将建议连接确认成正式连接。",
        "payload": {
          "fields": [
            {
              "id": "connectionId",
              "type": "uuid",
              "required": true
            }
          ]
        }
      },
      {
        "kind": "command",
        "type": "archiveConnection",
        "target": "Connection",
        "description": "归档建议连接，并在连接阶段提前结束闭环。",
        "payload": {
          "fields": [
            {
              "id": "connectionId",
              "type": "uuid",
              "required": true
            },
            {
              "id": "reason",
              "type": "text",
              "required": true,
              "description": "归档这条连接的业务原因说明。"
            }
          ]
        }
      },
      {
        "kind": "command",
        "type": "acceptSuggestedCard",
        "target": "Card",
        "description": "接受建议卡片，使闭环正常完成。",
        "payload": {
          "fields": [
            {
              "id": "cardId",
              "type": "uuid",
              "required": true
            }
          ]
        }
      },
      {
        "kind": "command",
        "type": "archiveCard",
        "target": "Card",
        "description": "归档建议卡片，并在卡片阶段提前结束闭环。",
        "payload": {
          "fields": [
            {
              "id": "cardId",
              "type": "uuid",
              "required": true
            },
            {
              "id": "reason",
              "type": "text",
              "required": true,
              "description": "归档这张卡片的业务原因说明。"
            }
          ]
        }
      }
    ],
    "events": [
      {
        "kind": "event",
        "type": "ConnectionConfirmed",
        "source": "Connection",
        "description": "连接聚合已从 suggested 进入 confirmed。",
        "payload": {
          "fields": [
            {
              "id": "connectionId",
              "type": "uuid",
              "required": true
            }
          ]
        }
      },
      {
        "kind": "event",
        "type": "ConnectionArchived",
        "source": "Connection",
        "description": "连接聚合已从 suggested 进入 archived。",
        "payload": {
          "fields": [
            {
              "id": "connectionId",
              "type": "uuid",
              "required": true
            },
            {
              "id": "reason",
              "type": "text",
              "required": true,
              "description": "触发连接归档的业务原因说明。"
            }
          ]
        }
      },
      {
        "kind": "event",
        "type": "CardAccepted",
        "source": "Card",
        "description": "卡片聚合已从 suggested 进入 accepted。",
        "payload": {
          "fields": [
            {
              "id": "cardId",
              "type": "uuid",
              "required": true
            }
          ]
        }
      },
      {
        "kind": "event",
        "type": "CardArchived",
        "source": "Card",
        "description": "卡片聚合已从 suggested 进入 archived。",
        "payload": {
          "fields": [
            {
              "id": "cardId",
              "type": "uuid",
              "required": true
            },
            {
              "id": "reason",
              "type": "text",
              "required": true,
              "description": "触发卡片归档的业务原因说明。"
            }
          ]
        }
      }
    ],
    "aggregates": [
      {
        "kind": "aggregate",
        "objectId": "Connection",
        "initial": "suggested",
        "states": {
          "suggested": {
            "on": {
              "confirmConnection": {
                "target": "confirmed",
                "emit": {
                  "type": "ConnectionConfirmed",
                  "payloadFrom": {
                    "connectionId": "$command.connectionId"
                  }
                }
              },
              "archiveConnection": {
                "target": "archived",
                "emit": {
                  "type": "ConnectionArchived",
                  "payloadFrom": {
                    "connectionId": "$command.connectionId",
                    "reason": "$command.reason"
                  }
                }
              }
            }
          },
          "confirmed": {},
          "archived": {}
        }
      },
      {
        "kind": "aggregate",
        "objectId": "Card",
        "initial": "suggested",
        "states": {
          "suggested": {
            "on": {
              "acceptSuggestedCard": {
                "target": "accepted",
                "emit": {
                  "type": "CardAccepted",
                  "payloadFrom": {
                    "cardId": "$command.cardId"
                  }
                }
              },
              "archiveCard": {
                "target": "archived",
                "emit": {
                  "type": "CardArchived",
                  "payloadFrom": {
                    "cardId": "$command.cardId",
                    "reason": "$command.reason"
                  }
                }
              }
            }
          },
          "accepted": {},
          "archived": {}
        }
      }
    ],
    "processes": [
      {
        "kind": "process",
        "id": "connectionCardReviewProcess",
        "title": "建议 Connection -> 建议 Card 审核闭环",
        "uses": {
          "aggregates": {
            "connection": "Connection",
            "card": "Card"
          }
        },
        "initialStage": "awaitingConnectionReview",
        "stages": {
          "awaitingConnectionReview": {
            "title": "等待连接审核",
            "aggregate": "connection",
            "state": "suggested",
            "advancesOn": {
              "ConnectionConfirmed": "awaitingCardReview",
              "ConnectionArchived": "closedConnectionArchived"
            }
          },
          "awaitingCardReview": {
            "title": "等待卡片审核",
            "aggregate": "card",
            "state": "suggested",
            "advancesOn": {
              "CardAccepted": "closedCardAccepted",
              "CardArchived": "closedCardArchived"
            }
          },
          "closedConnectionArchived": {
            "title": "连接阶段已归档关闭",
            "final": true,
            "outcome": "connectionArchived"
          },
          "closedCardArchived": {
            "title": "卡片阶段已归档关闭",
            "final": true,
            "outcome": "cardArchived"
          },
          "closedCardAccepted": {
            "title": "卡片阶段已接受关闭",
            "final": true,
            "outcome": "cardAccepted"
          }
        }
      }
    ]
  }
} as const;
