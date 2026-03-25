import type {
  AggregateObjectSpec,
  AggregateSpec,
  BusinessSpec,
  FieldSpec,
  FieldStructure,
  ObjectSpec,
  ObjectRole,
  RelationCardinality,
  RelationKind,
  RelationSpec
} from "./spec.js";
import {
  FIELD_STRUCTURES,
  isAggregateObjectSpec,
  isEnumObjectSpec,
  OBJECT_ROLES,
  RELATION_CARDINALITIES,
  RELATION_KINDS
} from "./spec.js";

export function validateBusinessSpecSemantics(spec: BusinessSpec): void {
  const objectMap = asMap(spec.domain.objects, "id", "object");
  const commandMap = asMap(spec.domain.commands, "type", "command");
  const eventMap = asMap(spec.domain.events, "type", "event");
  const aggregateMap = asMap(spec.domain.aggregates, "objectId", "aggregate");
  asMap(spec.domain.processes, "id", "process");

  for (const object of spec.domain.objects) {
    const objectLabel = describeObject(object);
    const relations = getRelations(object);
    const role = getObjectRole(object);

    assertUniqueRelations(relations, `object ${object.id}`);
    validateRelations(object, objectMap, relations);

    if (role === "aggregate") {
      assertPropertyAbsent(object, "values", `${objectLabel} role aggregate cannot declare values`);
      const fields = getObjectFields(object);
      const lifecycle = getLifecycle(object);
      const lifecycleField = getLifecycleField(object);

      assertUniqueFields(fields, `object ${object.id}`);
      assertUniqueStrings(lifecycle, `object ${object.id} lifecycle`);
      validateFieldTargets(fields, objectMap, objectLabel);
      assertIncludes(
        fields.map((field) => field.id),
        lifecycleField,
        `${objectLabel} lifecycleField must exist in fields`
      );
      continue;
    }

    assertPropertyAbsent(object, "fields", `${objectLabel} role enum cannot declare fields`);
    assertPropertyAbsent(
      object,
      "lifecycle",
      `${objectLabel} role enum cannot declare lifecycle`
    );
    assertPropertyAbsent(
      object,
      "lifecycleField",
      `${objectLabel} role enum cannot declare lifecycleField`
    );
    assertUniqueStrings(getEnumValues(object), `enum ${object.id} values`);
  }

  for (const command of spec.domain.commands) {
    assertUniqueFields(command.payload.fields, `command ${command.type}`);
    validateFieldTargets(command.payload.fields, objectMap, `Command ${command.type}`);

    const targetObject = objectMap.get(command.target);

    if (!targetObject) {
      throw new Error(`Command ${command.type} targets unknown object ${command.target}`);
    }

    if (!isAggregateObjectSpec(targetObject)) {
      throw new Error(
        `Command ${command.type} must target aggregate object ${command.target}`
      );
    }
  }

  for (const event of spec.domain.events) {
    assertUniqueFields(event.payload.fields, `event ${event.type}`);
    validateFieldTargets(event.payload.fields, objectMap, `Event ${event.type}`);

    const sourceObject = objectMap.get(event.source);

    if (!sourceObject) {
      throw new Error(`Event ${event.type} sources unknown object ${event.source}`);
    }

    if (!isAggregateObjectSpec(sourceObject)) {
      throw new Error(`Event ${event.type} must source aggregate object ${event.source}`);
    }
  }

  for (const aggregate of spec.domain.aggregates) {
    const object = mustGetAggregateObjectSpec(objectMap, aggregate.objectId);
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
    const object = mustGet(objectMap, objectId, "object");

    if (isAggregateObjectSpec(object) && !aggregateMap.has(objectId)) {
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

function mustGet<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key, label: string): Value {
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

function assertUniqueRelations(relations: readonly RelationSpec[], label: string): void {
  const relationIds = new Set<string>();

  for (const relation of relations) {
    if (relationIds.has(relation.id)) {
      throw new Error(`Duplicate relation ${relation.id} in ${label}`);
    }

    relationIds.add(relation.id);
  }
}

function assertUniqueStrings(values: readonly string[], label: string): void {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate value ${value} in ${label}`);
    }

    uniqueValues.add(value);
  }
}

function validateFieldTargets(
  fields: readonly FieldSpec[],
  objectMap: ReadonlyMap<string, ObjectSpec>,
  label: string
): void {
  for (const field of fields) {
    const fieldLabel = `${label} field ${field.id}`;
    const structure = getFieldStructure(field, fieldLabel);
    const target = getOptionalNonEmptyString(
      (field as { target?: unknown }).target,
      `${fieldLabel} target`
    );

    if (!structure) {
      if (target) {
        throw new Error(`${fieldLabel} target requires structure`);
      }

      continue;
    }

    if (structure === "scalar") {
      if (target) {
        throw new Error(`${fieldLabel} cannot declare target for scalar structure`);
      }

      continue;
    }

    if (!target) {
      throw new Error(`${fieldLabel} must declare target for ${structure}`);
    }

    const targetObject = objectMap.get(target);

    if (!targetObject) {
      throw new Error(`${fieldLabel} ${structure} target ${target} must reference existing object`);
    }

    if (structure === "enum" && !isEnumObjectSpec(targetObject)) {
      throw new Error(
        `${fieldLabel} enum target ${target} must reference enum object`
      );
    }

    if (structure === "reference" && isEnumObjectSpec(targetObject)) {
      throw new Error(
        `${fieldLabel} reference target ${target} cannot reference enum object`
      );
    }
  }
}

function validateRelations(
  object: ObjectSpec,
  objectMap: ReadonlyMap<string, ObjectSpec>,
  relations: readonly RelationSpec[]
): void {
  const fieldIds =
    getObjectRole(object) === "aggregate"
      ? new Set(getObjectFields(object).map((field) => field.id))
      : undefined;

  for (const relation of relations) {
    const relationLabel = `${describeObject(object)} relation ${relation.id}`;
    const target = getRequiredNonEmptyString(
      (relation as { target?: unknown }).target,
      `${relationLabel} target`
    );

    getRelationKind(relation, relationLabel);
    getRelationCardinality(relation, relationLabel);

    if (!objectMap.has(target)) {
      throw new Error(`${relationLabel} target ${target} must reference existing object`);
    }

    const field = getOptionalNonEmptyString(
      (relation as { field?: unknown }).field,
      `${relationLabel} field`
    );

    if (!field) {
      continue;
    }

    if (!fieldIds) {
      throw new Error(`${relationLabel} cannot bind field ${field}`);
    }

    if (!fieldIds.has(field)) {
      throw new Error(`${relationLabel} field ${field} must exist in fields`);
    }
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

function mustGetAggregateObjectSpec(
  objectMap: ReadonlyMap<string, ObjectSpec>,
  objectId: string
): AggregateObjectSpec {
  const object = objectMap.get(objectId);

  if (!object) {
    throw new Error(`Aggregate ${objectId} objectId must reference existing object`);
  }

  if (!isAggregateObjectSpec(object)) {
    throw new Error(`Aggregate ${objectId} must bind to object role aggregate`);
  }

  return object;
}

function describeObject(object: ObjectSpec): string {
  return `Object ${String((object as { id?: unknown }).id ?? "<unknown>")}`;
}

function getObjectRole(object: ObjectSpec): ObjectRole {
  return getAllowedValue(
    (object as { role?: unknown }).role,
    OBJECT_ROLES,
    `${describeObject(object)} role`
  );
}

function getObjectFields(object: ObjectSpec): readonly FieldSpec[] {
  return getNonEmptyArray(
    (object as { fields?: unknown }).fields,
    `${describeObject(object)} fields`
  ) as readonly FieldSpec[];
}

function getLifecycle(object: ObjectSpec): readonly string[] {
  return getNonEmptyStringArray(
    (object as { lifecycle?: unknown }).lifecycle,
    `${describeObject(object)} lifecycle`
  );
}

function getLifecycleField(object: ObjectSpec): string {
  return getRequiredNonEmptyString(
    (object as { lifecycleField?: unknown }).lifecycleField,
    `${describeObject(object)} lifecycleField`
  );
}

function getEnumValues(object: ObjectSpec): readonly string[] {
  return getNonEmptyStringArray(
    (object as { values?: unknown }).values,
    `${describeObject(object)} role enum values`
  );
}

function getRelations(object: ObjectSpec): readonly RelationSpec[] {
  const relations = (object as { relations?: unknown }).relations;

  if (relations === undefined) {
    return [];
  }

  if (!Array.isArray(relations)) {
    throw new Error(`${describeObject(object)} relations must be an array`);
  }

  return relations as readonly RelationSpec[];
}

function getFieldStructure(field: FieldSpec, label: string): FieldStructure | undefined {
  const structure = (field as { structure?: unknown }).structure;

  if (structure === undefined) {
    return undefined;
  }

  return getAllowedValue(structure, FIELD_STRUCTURES, `${label} structure`);
}

function getRelationKind(relation: RelationSpec, label: string): RelationKind {
  return getAllowedValue((relation as { kind?: unknown }).kind, RELATION_KINDS, `${label} kind`);
}

function getRelationCardinality(
  relation: RelationSpec,
  label: string
): RelationCardinality | undefined {
  const cardinality = (relation as { cardinality?: unknown }).cardinality;

  if (cardinality === undefined) {
    return undefined;
  }

  return getAllowedValue(
    cardinality,
    RELATION_CARDINALITIES,
    `${label} cardinality`
  );
}

function getRequiredNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function getOptionalNonEmptyString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return getRequiredNonEmptyString(value, label);
}

function getNonEmptyArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }

  return value;
}

function getNonEmptyStringArray(value: unknown, label: string): readonly string[] {
  const values = getNonEmptyArray(value, label);

  for (const [index, item] of values.entries()) {
    if (typeof item !== "string" || item.length === 0) {
      throw new Error(`${label}[${index}] must be a non-empty string`);
    }
  }

  return values as readonly string[];
}

function getAllowedValue<Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  label: string
): Value {
  if (typeof value !== "string" || !allowed.some((candidate) => candidate === value)) {
    throw new Error(`${label} ${formatValue(value)} must be one of ${allowed.join(", ")}`);
  }

  return value as Value;
}

function assertPropertyAbsent(
  value: object,
  propertyName: string,
  message: string
): void {
  if (Object.prototype.hasOwnProperty.call(value, propertyName)) {
    throw new Error(message);
  }
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value) ?? String(value);
}
