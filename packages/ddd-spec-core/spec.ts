import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import { validateBusinessSpecSemantics } from "./semantic-validation.js";

export const BUSINESS_SPEC_SCHEMA_VERSION = 2 as const;

export const OBJECT_ROLES = ["entity", "value-object", "enum"] as const;

export type ObjectRole = (typeof OBJECT_ROLES)[number];

export const RELATION_KINDS = ["association", "composition", "reference"] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];
export const RELATION_CARDINALITIES = ["1", "0..1", "0..n", "1..n"] as const;

export type RelationCardinality = (typeof RELATION_CARDINALITIES)[number];

export const FIELD_REF_KINDS = ["enum", "composition", "reference"] as const;

export type FieldRefKind = (typeof FIELD_REF_KINDS)[number];

export interface FieldRefSpec {
  kind: FieldRefKind;
  objectId: string;
  cardinality?: RelationCardinality;
}

export interface FieldSpec {
  id: string;
  type: string;
  required: boolean;
  description?: string;
  ref?: FieldRefSpec;
}

export interface PayloadSpec {
  fields: readonly FieldSpec[];
}

export interface RelationSpec {
  id: string;
  kind: RelationKind;
  target: string;
  cardinality?: RelationCardinality;
  description?: string;
}

interface BaseObjectSpec {
  kind: "object";
  id: string;
  title: string;
  role: ObjectRole;
}

interface FieldedObjectSpec extends BaseObjectSpec {
  fields: readonly FieldSpec[];
  relations?: readonly RelationSpec[];
}

export interface EntityObjectSpec extends FieldedObjectSpec {
  role: "entity";
  lifecycleField?: string;
  lifecycle?: readonly string[];
}

export interface ValueObjectSpec extends FieldedObjectSpec {
  role: "value-object";
}

export interface AggregateObjectSpec extends EntityObjectSpec {
  lifecycleField: string;
  lifecycle: readonly string[];
}

export interface EnumObjectSpec extends BaseObjectSpec {
  role: "enum";
  values: readonly string[];
}

export type ObjectSpec = EntityObjectSpec | ValueObjectSpec | EnumObjectSpec;

export interface CommandSpec {
  kind: "command";
  type: string;
  target: string;
  description: string;
  payload: PayloadSpec;
}

export interface EventSpec {
  kind: "event";
  type: string;
  source: string;
  description: string;
  payload: PayloadSpec;
}

export interface AggregateTransitionSpec {
  target: string;
  emit: {
    type: string;
    payloadFrom: Record<string, string>;
  };
}

export interface AggregateStateSpec {
  on?: Readonly<Record<string, AggregateTransitionSpec>>;
}

export interface AggregateSpec {
  kind: "aggregate";
  objectId: string;
  initial: string;
  states: Readonly<Record<string, AggregateStateSpec>>;
}

export interface ProcessUsesSpec {
  aggregates: Readonly<Record<string, string>>;
}

export interface ProcessStageSpec {
  title: string;
  aggregate?: string;
  state?: string;
  advancesOn?: Readonly<Record<string, string>>;
  final?: boolean;
  outcome?: string;
}

export interface ProcessSpec {
  kind: "process";
  id: string;
  title: string;
  uses: ProcessUsesSpec;
  initialStage: string;
  stages: Readonly<Record<string, ProcessStageSpec>>;
}

export interface ViewerDetailSemanticSpec {
  label: string;
  description: string;
}

export interface BusinessVocabularySpec {
  viewerDetails: Readonly<Record<string, ViewerDetailSemanticSpec>>;
}

export interface BusinessSpec {
  version: typeof BUSINESS_SPEC_SCHEMA_VERSION;
  id: string;
  title: string;
  summary: string;
  vocabulary: BusinessVocabularySpec;
  domain: {
    objects: readonly ObjectSpec[];
    commands: readonly CommandSpec[];
    events: readonly EventSpec[];
    aggregates: readonly AggregateSpec[];
    processes: readonly ProcessSpec[];
  };
}

export interface CanonicalIndexSpec {
  version: typeof BUSINESS_SPEC_SCHEMA_VERSION;
  id: string;
  title: string;
  summary: string;
  vocabulary: {
    viewerDetails: string;
  };
  domain: {
    objects: string[];
    commands: string[];
    events: string[];
    aggregates: string[];
    processes: string[];
  };
}

export interface LoadBusinessSpecOptions {
  entryPath: string;
  validateSemantics?: boolean;
}

export function isEntityObjectSpec(object: ObjectSpec): object is EntityObjectSpec {
  return object.role === "entity";
}

export function isValueObjectSpec(object: ObjectSpec): object is ValueObjectSpec {
  return object.role === "value-object";
}

export function hasObjectFields(object: ObjectSpec): object is EntityObjectSpec | ValueObjectSpec {
  return isEntityObjectSpec(object) || isValueObjectSpec(object);
}

export function isEnumObjectSpec(object: ObjectSpec): object is EnumObjectSpec {
  return object.role === "enum";
}

export function hasAggregateLifecycle(object: ObjectSpec): object is AggregateObjectSpec {
  return (
    isEntityObjectSpec(object) &&
    typeof object.lifecycleField === "string" &&
    Array.isArray(object.lifecycle)
  );
}

export async function loadCanonicalIndexSpec(entryPath: string): Promise<CanonicalIndexSpec> {
  return loadYamlFile<CanonicalIndexSpec>(entryPath);
}

export async function loadBusinessSpec(
  options: LoadBusinessSpecOptions
): Promise<BusinessSpec> {
  const index = await loadCanonicalIndexSpec(options.entryPath);
  const baseDir = dirname(options.entryPath);

  const businessSpec: BusinessSpec = {
    version: index.version,
    id: index.id,
    title: index.title,
    summary: index.summary,
    vocabulary: {
      viewerDetails: await loadYamlFile<BusinessVocabularySpec["viewerDetails"]>(
        resolve(baseDir, index.vocabulary.viewerDetails)
      )
    },
    domain: {
      objects: await loadMany<ObjectSpec>(baseDir, index.domain.objects),
      commands: await loadMany<CommandSpec>(baseDir, index.domain.commands),
      events: await loadMany<EventSpec>(baseDir, index.domain.events),
      aggregates: await loadMany<AggregateSpec>(baseDir, index.domain.aggregates),
      processes: await loadMany<ProcessSpec>(baseDir, index.domain.processes)
    }
  };

  if (options.validateSemantics !== false) {
    validateBusinessSpecSemantics(businessSpec);
  }

  return businessSpec;
}

async function loadMany<Value>(baseDir: string, relativePaths: string[]): Promise<Value[]> {
  return Promise.all(
    relativePaths.map((relativePath) => loadYamlFile<Value>(resolve(baseDir, relativePath)))
  );
}

async function loadYamlFile<Value>(absolutePath: string): Promise<Value> {
  const source = await readFile(absolutePath, "utf8");

  return YAML.parse(source) as Value;
}
