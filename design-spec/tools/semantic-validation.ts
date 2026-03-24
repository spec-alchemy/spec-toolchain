import type {
  AggregateSpec,
  BusinessSpec,
  FieldSpec
} from "./spec.js";

export function validateBusinessSpecSemantics(spec: BusinessSpec): void {
  const objectMap = asMap(spec.domain.objects, "id", "object");
  const commandMap = asMap(spec.domain.commands, "type", "command");
  const eventMap = asMap(spec.domain.events, "type", "event");
  const aggregateMap = asMap(spec.domain.aggregates, "objectId", "aggregate");
  asMap(spec.domain.processes, "id", "process");

  for (const object of spec.domain.objects) {
    assertUniqueFields(object.fields, `object ${object.id}`);
    assertIncludes(
      object.fields.map((field) => field.id),
      object.lifecycleField,
      `Object ${object.id} lifecycleField must exist in fields`
    );
  }

  for (const command of spec.domain.commands) {
    assertUniqueFields(command.payload.fields, `command ${command.type}`);

    if (!objectMap.has(command.target)) {
      throw new Error(`Command ${command.type} targets unknown object ${command.target}`);
    }
  }

  for (const event of spec.domain.events) {
    assertUniqueFields(event.payload.fields, `event ${event.type}`);

    if (!objectMap.has(event.source)) {
      throw new Error(`Event ${event.type} sources unknown object ${event.source}`);
    }
  }

  for (const aggregate of spec.domain.aggregates) {
    const object = mustGet(objectMap, aggregate.objectId, "object");
    const lifecycle = new Set(object.lifecycle);
    const aggregateStates = Object.keys(aggregate.states);

    assertIncludes(
      object.lifecycle,
      aggregate.initial,
      `Aggregate ${aggregate.objectId} initial state must belong to object lifecycle`
    );

    for (const lifecycleState of object.lifecycle) {
      if (!aggregateStates.includes(lifecycleState)) {
        throw new Error(
          `Aggregate ${aggregate.objectId} is missing lifecycle state ${lifecycleState}`
        );
      }
    }

    for (const stateId of aggregateStates) {
      if (!lifecycle.has(stateId)) {
        throw new Error(
          `Aggregate ${aggregate.objectId} defines unknown lifecycle state ${stateId}`
        );
      }

      const state = aggregate.states[stateId];

      for (const [commandType, transition] of Object.entries(state.on ?? {})) {
        const command = mustGet(commandMap, commandType, "command");
        const event = mustGet(eventMap, transition.emit.type, "event");

        if (command.target !== aggregate.objectId) {
          throw new Error(
            `Aggregate ${aggregate.objectId} cannot accept command ${commandType} targeting ${command.target}`
          );
        }

        if (!lifecycle.has(transition.target)) {
          throw new Error(
            `Aggregate ${aggregate.objectId} transition ${commandType} targets unknown lifecycle ${transition.target}`
          );
        }

        if (event.source !== aggregate.objectId) {
          throw new Error(
            `Aggregate ${aggregate.objectId} emits event ${event.type} sourced from ${event.source}`
          );
        }

        const commandFieldMap = asMap(
          command.payload.fields,
          "id",
          `command field of ${command.type}`
        );
        const eventFieldMap = asMap(event.payload.fields, "id", `event field of ${event.type}`);
        const eventFields = event.payload.fields.map((field) => field.id);
        const payloadFromKeys = Object.keys(transition.emit.payloadFrom);

        if (payloadFromKeys.length !== eventFields.length) {
          throw new Error(
            `Aggregate ${aggregate.objectId} transition ${commandType} must map every field of event ${event.type}`
          );
        }

        for (const eventFieldId of eventFields) {
          const sourceRef = transition.emit.payloadFrom[eventFieldId];

          if (!sourceRef) {
            throw new Error(
              `Aggregate ${aggregate.objectId} transition ${commandType} is missing payload mapping for ${event.type}.${eventFieldId}`
            );
          }

          const commandFieldId = unwrapCommandFieldReference(sourceRef);
          const commandField = mustGet(
            commandFieldMap,
            commandFieldId,
            `command field ${command.type}.${commandFieldId}`
          );
          const eventField = mustGet(
            eventFieldMap,
            eventFieldId,
            `event field ${event.type}.${eventFieldId}`
          );

          if (commandField.type !== eventField.type) {
            throw new Error(
              `Aggregate ${aggregate.objectId} transition ${commandType} maps ${command.type}.${commandFieldId}:${commandField.type} to ${event.type}.${eventFieldId}:${eventField.type}`
            );
          }

          if (eventField.required && !commandField.required) {
            throw new Error(
              `Aggregate ${aggregate.objectId} transition ${commandType} maps optional command field ${command.type}.${commandFieldId} to required event field ${event.type}.${eventFieldId}`
            );
          }
        }
      }
    }
  }

  for (const process of spec.domain.processes) {
    const stageIds = Object.keys(process.stages);
    const usedAggregateAliases = new Set<string>();

    assertIncludes(
      stageIds,
      process.initialStage,
      `Process ${process.id} initialStage must exist in stages`
    );

    for (const [stageId, stage] of Object.entries(process.stages)) {
      if (stage.final && !stage.outcome) {
        throw new Error(`Process ${process.id} final stage ${stageId} must define outcome`);
      }

      if (!stage.final && stage.outcome) {
        throw new Error(`Process ${process.id} non-final stage ${stageId} cannot define outcome`);
      }

      if (
        stage.final &&
        (stage.aggregate || stage.state || Object.keys(stage.advancesOn ?? {}).length > 0)
      ) {
        throw new Error(
          `Process ${process.id} final stage ${stageId} cannot define aggregate, state, or advancesOn`
        );
      }

      if (!stage.final) {
        if (!stage.aggregate || !stage.state) {
          throw new Error(
            `Process ${process.id} stage ${stageId} must define both aggregate and state`
          );
        }

        const boundObjectId = process.uses.aggregates[stage.aggregate];

        if (!boundObjectId) {
          throw new Error(
            `Process ${process.id} stage ${stageId} references unknown aggregate alias ${stage.aggregate}`
          );
        }

        usedAggregateAliases.add(stage.aggregate);

        const aggregate = mustGet(aggregateMap, boundObjectId, "aggregate");
        const aggregateState = getAggregateState(aggregate, stage.state);

        const reachableEventTypes = new Set(
          Object.values(aggregateState.on ?? {}).map((transition) => transition.emit.type)
        );

        for (const [eventType, targetStage] of Object.entries(stage.advancesOn ?? {})) {
          const event = mustGet(eventMap, eventType, "event");

          if (!stageIds.includes(targetStage)) {
            throw new Error(
              `Process ${process.id} stage ${stageId} advances to unknown stage ${targetStage}`
            );
          }

          if (!reachableEventTypes.has(eventType)) {
            throw new Error(
              `Process ${process.id} stage ${stageId} observes ${eventType}, but aggregate ${aggregate.objectId} state ${stage.state} cannot emit it`
            );
          }

          if (event.source !== aggregate.objectId) {
            throw new Error(
              `Process ${process.id} stage ${stageId} observes ${eventType} from ${event.source}, but this stage binds to aggregate ${aggregate.objectId}`
            );
          }
        }
      }
    }

    for (const [aggregateAlias, objectId] of Object.entries(process.uses.aggregates)) {
      mustGet(aggregateMap, objectId, "aggregate");

      if (!usedAggregateAliases.has(aggregateAlias)) {
        throw new Error(
          `Process ${process.id} declares aggregate alias ${aggregateAlias}, but no stage uses it`
        );
      }
    }
  }

  for (const objectId of objectMap.keys()) {
    if (!aggregateMap.has(objectId)) {
      throw new Error(`Object ${objectId} is missing aggregate definition`);
    }
  }
}

function asMap<Value extends Record<Key, string>, Key extends keyof Value>(
  values: readonly Value[],
  key: Key,
  label: string
): Map<Value[Key], Value> {
  const entries = new Map<Value[Key], Value>();

  for (const value of values) {
    const entryKey = value[key];

    if (entries.has(entryKey)) {
      throw new Error(`Duplicate ${label} ${String(entryKey)}`);
    }

    entries.set(entryKey, value);
  }

  return entries;
}

function mustGet<Key, Value>(map: Map<Key, Value>, key: Key, label: string): Value {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Unknown ${label} ${String(key)}`);
  }

  return value;
}

function assertIncludes(values: readonly string[], expected: string, message: string): void {
  if (!values.includes(expected)) {
    throw new Error(message);
  }
}

function assertUniqueFields(fields: readonly FieldSpec[], label: string): void {
  const fieldIds = new Set<string>();

  for (const field of fields) {
    if (fieldIds.has(field.id)) {
      throw new Error(`Duplicate field ${field.id} in ${label}`);
    }

    fieldIds.add(field.id);
  }
}

function getAggregateState(
  aggregate: AggregateSpec,
  stateId: string
): AggregateSpec["states"][string] {
  const state = aggregate.states[stateId];

  if (!state) {
    throw new Error(`Aggregate ${aggregate.objectId} defines unknown lifecycle state ${stateId}`);
  }

  return state;
}

function unwrapCommandFieldReference(reference: string): string {
  const prefix = "$command.";

  if (!reference.startsWith(prefix)) {
    throw new Error(`Unsupported payload reference ${reference}`);
  }

  return reference.slice(prefix.length);
}
