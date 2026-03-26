import type {
  AggregateObjectSpec,
  AggregateSpec,
  BusinessSpec,
  LoadedBusinessSpec,
  EntityObjectSpec,
  FieldRefKind,
  FieldRefSpec,
  FieldSpec,
  ObjectSpec,
  RelationCardinality,
  RelationKind,
  RelationSpec
} from "./spec.js";
import {
  FIELD_REF_KINDS,
  hasAggregateLifecycle,
  hasObjectFields,
  isEntityObjectSpec,
  isEnumObjectSpec,
  isVnextBusinessSpec,
  isValueObjectSpec,
  OBJECT_ROLES,
  RELATION_CARDINALITIES,
  RELATION_KINDS
} from "./spec.js";
import { validateVnextBusinessSpecSemantics } from "./vnext-semantic-validation.js";

interface CompositionEdge {
  sourceObjectId: string;
  targetObjectId: string;
  sourceLabel: string;
}

export function validateBusinessSpecSemantics(spec: LoadedBusinessSpec): void {
  if (isVnextBusinessSpec(spec)) {
    validateVnextBusinessSpecSemantics(spec);
    return;
  }

  validateLegacyBusinessSpecSemantics(spec);
}

function validateLegacyBusinessSpecSemantics(spec: BusinessSpec): void {
  const objectMap = asMap(spec.domain.objects, "id", "object");
  const commandMap = asMap(spec.domain.commands, "type", "command");
  const eventMap = asMap(spec.domain.events, "type", "event");
  const aggregateMap = asMap(spec.domain.aggregates, "objectId", "aggregate");
  asMap(spec.domain.processes, "id", "process");

  for (const object of spec.domain.objects) {
    const objectLabel = describeObject(object);
    const objectRole = getObjectRole(object, objectLabel);
    const relations = getRelations(object);

    assertUniqueRelations(relations, `object ${object.id}`);
    validateRelations(object, objectMap, relations);

    if (objectRole === "entity") {
      validateEntityObject(object as EntityObjectSpec, objectMap, relations, objectLabel);
      continue;
    }

    if (objectRole === "value-object") {
      validateValueObject(
        object as ObjectSpec & { role: "value-object"; fields: readonly FieldSpec[] },
        objectMap,
        relations,
        objectLabel
      );
      continue;
    }

    validateEnumObject(object as ObjectSpec & { role: "enum" }, relations, objectLabel);
  }

  validateCompositionTopology(spec.domain.objects, objectMap, aggregateMap);

  for (const command of spec.domain.commands) {
    assertUniqueFields(command.payload.fields, `command ${command.type}`);
    validateFieldRefs(command.payload.fields, objectMap, `Command ${command.type}`);

    mustGetAggregateRootObjectSpec(
      objectMap,
      aggregateMap,
      command.target,
      `Command ${command.type} target ${command.target}`
    );
  }

  for (const event of spec.domain.events) {
    assertUniqueFields(event.payload.fields, `event ${event.type}`);
    validateFieldRefs(event.payload.fields, objectMap, `Event ${event.type}`);

    mustGetAggregateRootObjectSpec(
      objectMap,
      aggregateMap,
      event.source,
      `Event ${event.type} source ${event.source}`
    );
  }

  for (const aggregate of spec.domain.aggregates) {
    const object = mustGetAggregateRootObjectSpec(
      objectMap,
      aggregateMap,
      aggregate.objectId,
      `Aggregate ${aggregate.objectId} objectId`
    );
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
}

function validateEntityObject(
  object: EntityObjectSpec,
  objectMap: ReadonlyMap<string, ObjectSpec>,
  relations: readonly RelationSpec[],
  objectLabel: string
): void {
  assertPropertyAbsent(object, "values", `${objectLabel} role entity cannot declare values`);
  assertUniqueFields(object.fields, `object ${object.id}`);
  validateFieldRefs(object.fields, objectMap, objectLabel);
  assertNoDuplicateFieldRelations(object, relations);

  const lifecycleField = getOptionalNonEmptyString(
    (object as { lifecycleField?: unknown }).lifecycleField,
    `${objectLabel} lifecycleField`
  );
  const lifecycle = getOptionalStringArray(
    (object as { lifecycle?: unknown }).lifecycle,
    `${objectLabel} lifecycle`
  );

  if (lifecycleField || lifecycle) {
    if (!lifecycleField || !lifecycle) {
      throw new Error(`${objectLabel} must declare both lifecycleField and lifecycle together`);
    }

    assertUniqueStrings(lifecycle, `object ${object.id} lifecycle`);
    assertIncludes(
      object.fields.map((field) => field.id),
      lifecycleField,
      `${objectLabel} lifecycleField must exist in fields`
    );
  }
}

function validateValueObject(
  object: ObjectSpec & { role: "value-object"; fields: readonly FieldSpec[] },
  objectMap: ReadonlyMap<string, ObjectSpec>,
  relations: readonly RelationSpec[],
  objectLabel: string
): void {
  assertPropertyAbsent(
    object,
    "values",
    `${objectLabel} role value-object cannot declare values`
  );
  assertPropertyAbsent(
    object,
    "lifecycle",
    `${objectLabel} role value-object cannot declare lifecycle`
  );
  assertPropertyAbsent(
    object,
    "lifecycleField",
    `${objectLabel} role value-object cannot declare lifecycleField`
  );
  assertUniqueFields(object.fields, `object ${object.id}`);
  validateFieldRefs(object.fields, objectMap, objectLabel);
  assertNoDuplicateFieldRelations(object, relations);
}

function validateEnumObject(
  object: ObjectSpec & { role: "enum" },
  relations: readonly RelationSpec[],
  objectLabel: string
): void {
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

  if (relations.length > 0) {
    throw new Error(`${objectLabel} role enum cannot declare relations`);
  }

  assertUniqueStrings(getEnumValues(object), `enum ${object.id} values`);
}

function validateCompositionTopology(
  objects: readonly ObjectSpec[],
  objectMap: ReadonlyMap<string, ObjectSpec>,
  aggregateMap: ReadonlyMap<string, AggregateSpec>
): void {
  const incomingParentsByObjectId = new Map<string, string[]>();
  const compositionEdges = collectCompositionEdges(objects);

  for (const edge of compositionEdges) {
    const targetObject = mustGet(objectMap, edge.targetObjectId, "object");

    if (isEnumObjectSpec(targetObject)) {
      throw new Error(
        `${edge.sourceLabel} composition target ${edge.targetObjectId} cannot reference enum object`
      );
    }

    if (aggregateMap.has(edge.targetObjectId)) {
      throw new Error(
        `${edge.sourceLabel} composition target ${edge.targetObjectId} cannot reference aggregate root object`
      );
    }

    if (edge.sourceObjectId === edge.targetObjectId) {
      throw new Error(`${edge.sourceLabel} cannot compose itself`);
    }

    incomingParentsByObjectId.set(edge.targetObjectId, [
      ...(incomingParentsByObjectId.get(edge.targetObjectId) ?? []),
      edge.sourceObjectId
    ]);
  }

  for (const [objectId, parentIds] of incomingParentsByObjectId.entries()) {
    if (parentIds.length > 1) {
      throw new Error(
        `Object ${objectId} cannot have more than one composition parent: ${[...parentIds].sort().join(", ")}`
      );
    }
  }

  assertNoCompositionCycles(compositionEdges);
}

function collectCompositionEdges(objects: readonly ObjectSpec[]): readonly CompositionEdge[] {
  const edges: CompositionEdge[] = [];

  for (const object of objects) {
    if (hasObjectFields(object)) {
      for (const field of object.fields) {
        if (field.ref?.kind !== "composition") {
          continue;
        }

        edges.push({
          sourceObjectId: object.id,
          targetObjectId: field.ref.objectId,
          sourceLabel: `${describeObject(object)} field ${field.id}`
        });
      }
    }

    for (const relation of getRelations(object)) {
      if (relation.kind !== "composition") {
        continue;
      }

      edges.push({
        sourceObjectId: object.id,
        targetObjectId: relation.target,
        sourceLabel: `${describeObject(object)} relation ${relation.id}`
      });
    }
  }

  return edges;
}

function assertNoCompositionCycles(edges: readonly CompositionEdge[]): void {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    adjacency.set(edge.sourceObjectId, [
      ...(adjacency.get(edge.sourceObjectId) ?? []),
      edge.targetObjectId
    ]);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const objectId of adjacency.keys()) {
    visitCompositionNode(objectId, adjacency, visiting, visited, []);
  }
}

function visitCompositionNode(
  objectId: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
  visiting: Set<string>,
  visited: Set<string>,
  path: readonly string[]
): void {
  if (visited.has(objectId)) {
    return;
  }

  if (visiting.has(objectId)) {
    const cycleStartIndex = path.indexOf(objectId);
    const cyclePath =
      cycleStartIndex >= 0 ? [...path.slice(cycleStartIndex), objectId] : [...path, objectId];

    throw new Error(`Composition graph contains a cycle: ${cyclePath.join(" -> ")}`);
  }

  visiting.add(objectId);

  for (const targetObjectId of adjacency.get(objectId) ?? []) {
    visitCompositionNode(targetObjectId, adjacency, visiting, visited, [...path, objectId]);
  }

  visiting.delete(objectId);
  visited.add(objectId);
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

function validateFieldRefs(
  fields: readonly FieldSpec[],
  objectMap: ReadonlyMap<string, ObjectSpec>,
  label: string
): void {
  for (const field of fields) {
    const fieldLabel = `${label} field ${field.id}`;
    const ref = getOptionalFieldRef(field, fieldLabel);

    if (!ref) {
      continue;
    }

    const targetObject = objectMap.get(ref.objectId);

    if (!targetObject) {
      throw new Error(
        `${fieldLabel} ${ref.kind} target ${ref.objectId} must reference existing object`
      );
    }

    switch (ref.kind) {
      case "enum":
        if (!isEnumObjectSpec(targetObject)) {
          throw new Error(
            `${fieldLabel} enum target ${ref.objectId} must reference enum object`
          );
        }
        break;
      case "reference":
        if (isEnumObjectSpec(targetObject)) {
          throw new Error(
            `${fieldLabel} reference target ${ref.objectId} cannot reference enum object`
          );
        }
        break;
      case "composition":
        if (isEnumObjectSpec(targetObject)) {
          throw new Error(
            `${fieldLabel} composition target ${ref.objectId} cannot reference enum object`
          );
        }
        break;
    }
  }
}

function validateRelations(
  object: ObjectSpec,
  objectMap: ReadonlyMap<string, ObjectSpec>,
  relations: readonly RelationSpec[]
): void {
  for (const relation of relations) {
    const relationLabel = `${describeObject(object)} relation ${relation.id}`;
    const target = getRequiredNonEmptyString(
      (relation as { target?: unknown }).target,
      `${relationLabel} target`
    );
    const kind = getRelationKind(relation, relationLabel);

    getRelationCardinality(relation, relationLabel);

    if (!objectMap.has(target)) {
      throw new Error(`${relationLabel} target ${target} must reference existing object`);
    }

    if (kind === "composition" && isEnumObjectSpec(mustGet(objectMap, target, "object"))) {
      throw new Error(`${relationLabel} composition target ${target} cannot reference enum object`);
    }
  }
}

function assertNoDuplicateFieldRelations(
  object: ObjectSpec & { fields: readonly FieldSpec[] },
  relations: readonly RelationSpec[]
): void {
  const fieldRelationKeys = new Set(
    object.fields.flatMap((field) => {
      const ref = field.ref;

      if (!ref) {
        return [];
      }

      return [toRelationKey(toRelationKindFromFieldRef(ref.kind), ref.objectId)];
    })
  );

  for (const relation of relations) {
    const relationKey = toRelationKey(relation.kind, relation.target);

    if (fieldRelationKeys.has(relationKey)) {
      throw new Error(
        `${describeObject(object)} relation ${relation.id} duplicates field-level relation ${relation.kind} -> ${relation.target}`
      );
    }
  }
}

function toRelationKindFromFieldRef(kind: FieldRefKind): RelationKind {
  switch (kind) {
    case "enum":
      return "association";
    case "composition":
      return "composition";
    case "reference":
      return "reference";
  }
}

function toRelationKey(kind: RelationKind, targetObjectId: string): string {
  return `${kind}:${targetObjectId}`;
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

function mustGetAggregateRootObjectSpec(
  objectMap: ReadonlyMap<string, ObjectSpec>,
  aggregateMap: ReadonlyMap<string, AggregateSpec>,
  objectId: string,
  label: string
): AggregateObjectSpec {
  const object = objectMap.get(objectId);

  if (!object) {
    throw new Error(`${label} must reference existing object`);
  }

  if (!isEntityObjectSpec(object)) {
    throw new Error(`${label} must reference entity object`);
  }

  if (!hasAggregateLifecycle(object)) {
    throw new Error(`${label} must declare lifecycleField and lifecycle`);
  }

  if (!aggregateMap.has(objectId)) {
    throw new Error(`${label} must reference aggregate root object`);
  }

  return object;
}

function describeObject(object: ObjectSpec): string {
  return `Object ${String((object as { id?: unknown }).id ?? "<unknown>")}`;
}

function getEnumValues(object: ObjectSpec): readonly string[] {
  return getNonEmptyStringArray(
    (object as { values?: unknown }).values,
    `${describeObject(object)} role enum values`
  );
}

function getObjectRole(
  object: ObjectSpec,
  objectLabel: string
): "entity" | "value-object" | "enum" {
  return getAllowedValue(
    (object as { role?: unknown }).role,
    OBJECT_ROLES,
    `${objectLabel} role`
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

function getOptionalFieldRef(field: FieldSpec, label: string): FieldRefSpec | undefined {
  const ref = (field as { ref?: unknown }).ref;

  if (ref === undefined) {
    return undefined;
  }

  if (typeof ref !== "object" || ref === null) {
    throw new Error(`${label} ref must be an object`);
  }

  const kind = getAllowedValue(
    (ref as { kind?: unknown }).kind,
    FIELD_REF_KINDS,
    `${label} ref.kind`
  );
  const objectId = getRequiredNonEmptyString(
    (ref as { objectId?: unknown }).objectId,
    `${label} ref.objectId`
  );
  const cardinality = getOptionalAllowedValue(
    (ref as { cardinality?: unknown }).cardinality,
    RELATION_CARDINALITIES,
    `${label} ref.cardinality`
  );

  return {
    kind,
    objectId,
    ...(cardinality ? { cardinality } : {})
  };
}

function getRelationKind(relation: RelationSpec, label: string): RelationKind {
  return getAllowedValue((relation as { kind?: unknown }).kind, RELATION_KINDS, `${label} kind`);
}

function getRelationCardinality(
  relation: RelationSpec,
  label: string
): RelationCardinality | undefined {
  return getOptionalAllowedValue(
    (relation as { cardinality?: unknown }).cardinality,
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

function getOptionalArray(value: unknown, label: string): readonly unknown[] | undefined {
  if (value === undefined) {
    return undefined;
  }

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

function getOptionalStringArray(value: unknown, label: string): readonly string[] | undefined {
  const values = getOptionalArray(value, label);

  if (!values) {
    return undefined;
  }

  for (const [index, item] of values.entries()) {
    if (typeof item !== "string" || item.length === 0) {
      throw new Error(`${label}[${index}] must be a non-empty string`);
    }
  }

  return values as readonly string[];
}

function assertPropertyAbsent(value: object, property: string, message: string): void {
  if (Object.prototype.hasOwnProperty.call(value, property)) {
    throw new Error(message);
  }
}

function getAllowedValue<const Allowed extends readonly string[]>(
  value: unknown,
  allowedValues: Allowed,
  label: string
): Allowed[number] {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw new Error(`${label} ${String(value)} must be one of ${allowedValues.join(", ")}`);
  }

  return value;
}

function getOptionalAllowedValue<const Allowed extends readonly string[]>(
  value: unknown,
  allowedValues: Allowed,
  label: string
): Allowed[number] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return getAllowedValue(value, allowedValues, label);
}
