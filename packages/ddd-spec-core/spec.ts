import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import { validateBusinessSpecSemantics } from "./semantic-validation.js";

export const BUSINESS_SPEC_SCHEMA_VERSION = 2 as const;
export const VNEXT_CANONICAL_SCHEMA_VERSION = 3 as const;

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

export const VNEXT_RESOURCE_KINDS = [
  "context",
  "actor",
  "system",
  "scenario",
  "message",
  "aggregate",
  "policy"
] as const;

export type VnextResourceKind = (typeof VNEXT_RESOURCE_KINDS)[number];

export const VNEXT_ACTOR_TYPES = ["person", "role", "team"] as const;

export type VnextActorType = (typeof VNEXT_ACTOR_TYPES)[number];

export const VNEXT_SYSTEM_BOUNDARIES = ["internal", "external"] as const;

export type VnextSystemBoundary = (typeof VNEXT_SYSTEM_BOUNDARIES)[number];

export const VNEXT_MESSAGE_KINDS = ["command", "event", "query"] as const;

export type VnextMessageKind = (typeof VNEXT_MESSAGE_KINDS)[number];

export const VNEXT_MESSAGE_CHANNELS = ["sync", "async"] as const;

export type VnextMessageChannel = (typeof VNEXT_MESSAGE_CHANNELS)[number];

export const VNEXT_CONTEXT_RELATIONSHIP_DIRECTIONS = [
  "upstream",
  "downstream",
  "bidirectional"
] as const;

export type VnextContextRelationshipDirection =
  (typeof VNEXT_CONTEXT_RELATIONSHIP_DIRECTIONS)[number];

export type VnextCollectionRef = string | readonly string[];

export interface VnextResourceRef {
  kind: VnextResourceKind;
  id: string;
}

export interface VnextPayloadFieldSpec {
  id: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface VnextContextRelationshipSpec {
  id: string;
  kind: string;
  target: VnextResourceRef;
  direction?: VnextContextRelationshipDirection;
  integration?: string;
  description?: string;
}

export interface VnextContextSpec {
  kind: "context";
  id: string;
  title: string;
  summary: string;
  owners: readonly string[];
  responsibilities: readonly string[];
  relationships?: readonly VnextContextRelationshipSpec[];
}

export interface VnextActorSpec {
  kind: "actor";
  id: string;
  title: string;
  summary: string;
  actorType?: VnextActorType;
}

export interface VnextSystemSpec {
  kind: "system";
  id: string;
  title: string;
  summary: string;
  boundary?: VnextSystemBoundary;
  capabilities?: readonly string[];
}

export interface VnextScenarioStepSpec {
  id: string;
  title: string;
  context: string;
  actor?: string;
  system?: string;
  incomingMessages?: readonly string[];
  outgoingMessages?: readonly string[];
  next?: readonly string[];
  final?: boolean;
  outcome?: string;
}

export interface VnextScenarioSpec {
  kind: "scenario";
  id: string;
  title: string;
  summary: string;
  goal: string;
  ownerContext: string;
  steps: readonly VnextScenarioStepSpec[];
}

export interface VnextMessageSpec {
  kind: "message";
  id: string;
  title: string;
  summary: string;
  messageKind: VnextMessageKind;
  channel?: VnextMessageChannel;
  producers: readonly VnextResourceRef[];
  consumers: readonly VnextResourceRef[];
  payload?: readonly VnextPayloadFieldSpec[];
}

export interface VnextAggregateTransitionSpec {
  id: string;
  from: string;
  to: string;
  onMessage: string;
  emits?: readonly string[];
}

export interface VnextAggregateSpec {
  kind: "aggregate";
  id: string;
  title: string;
  summary: string;
  context: string;
  lifecycleComplexity?: boolean;
  states: readonly string[];
  initialState: string;
  transitions: readonly VnextAggregateTransitionSpec[];
}

export interface VnextPolicySpec {
  kind: "policy";
  id: string;
  title: string;
  summary: string;
  context?: string;
  triggerMessages: readonly string[];
  emittedMessages?: readonly string[];
  targetSystems?: readonly string[];
  coordinates?: readonly VnextResourceRef[];
}

export interface VnextBusinessSpec {
  version: typeof VNEXT_CANONICAL_SCHEMA_VERSION;
  id: string;
  title: string;
  summary: string;
  contexts: readonly VnextContextSpec[];
  actors: readonly VnextActorSpec[];
  systems: readonly VnextSystemSpec[];
  scenarios: readonly VnextScenarioSpec[];
  messages: readonly VnextMessageSpec[];
  aggregates: readonly VnextAggregateSpec[];
  policies: readonly VnextPolicySpec[];
}

export interface VnextCanonicalIndexSpec {
  version: typeof VNEXT_CANONICAL_SCHEMA_VERSION;
  id: string;
  title: string;
  summary: string;
  model: {
    contexts: VnextCollectionRef;
    actors: VnextCollectionRef;
    systems: VnextCollectionRef;
    scenarios: VnextCollectionRef;
    messages: VnextCollectionRef;
    aggregates: VnextCollectionRef;
    policies: VnextCollectionRef;
  };
}

export type LoadedBusinessSpec = BusinessSpec | VnextBusinessSpec;

export interface LoadBusinessSpecOptions {
  entryPath: string;
  validateSemantics?: boolean;
}

export interface LoadVnextBusinessSpecOptions extends LoadBusinessSpecOptions {}

export interface LoadCanonicalSpecOptions extends LoadBusinessSpecOptions {}

const VNEXT_COLLECTION_FILE_SUFFIXES = {
  contexts: ".context.yaml",
  actors: ".actor.yaml",
  systems: ".system.yaml",
  scenarios: ".scenario.yaml",
  messages: ".message.yaml",
  aggregates: ".aggregate.yaml",
  policies: ".policy.yaml"
} as const;

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

export function isVnextBusinessSpec(spec: LoadedBusinessSpec): spec is VnextBusinessSpec {
  return spec.version === VNEXT_CANONICAL_SCHEMA_VERSION;
}

export function isLegacyBusinessSpec(spec: LoadedBusinessSpec): spec is BusinessSpec {
  return spec.version === BUSINESS_SPEC_SCHEMA_VERSION;
}

export async function loadCanonicalIndexSpec(entryPath: string): Promise<CanonicalIndexSpec> {
  return loadYamlFile<CanonicalIndexSpec>(entryPath);
}

export async function loadVnextCanonicalIndexSpec(
  entryPath: string
): Promise<VnextCanonicalIndexSpec> {
  return loadYamlFile<VnextCanonicalIndexSpec>(entryPath);
}

export async function loadCanonicalSpec(
  options: LoadCanonicalSpecOptions
): Promise<LoadedBusinessSpec> {
  const version = await loadCanonicalVersion(options.entryPath);

  if (version === BUSINESS_SPEC_SCHEMA_VERSION) {
    return loadBusinessSpec(options);
  }

  if (version === VNEXT_CANONICAL_SCHEMA_VERSION) {
    return loadVnextBusinessSpec(options);
  }

  throw new Error(
    `Unsupported canonical version ${String(version)} at ${options.entryPath}`
  );
}

export async function loadBusinessSpec(
  options: LoadBusinessSpecOptions
): Promise<BusinessSpec> {
  const index = await loadCanonicalIndexSpec(options.entryPath);
  const baseDir = dirname(options.entryPath);

  assertCanonicalVersion(
    index.version,
    BUSINESS_SPEC_SCHEMA_VERSION,
    options.entryPath,
    "loadBusinessSpec",
    "Use loadCanonicalSpec() or loadVnextBusinessSpec() for version 3 canonicals."
  );

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

export async function loadVnextBusinessSpec(
  options: LoadVnextBusinessSpecOptions
): Promise<VnextBusinessSpec> {
  const index = await loadVnextCanonicalIndexSpec(options.entryPath);
  const baseDir = dirname(options.entryPath);
  const [
    contexts,
    actors,
    systems,
    scenarios,
    messages,
    aggregates,
    policies
  ] = await Promise.all([
    loadVnextCollection<VnextContextSpec>(
      baseDir,
      index.model.contexts,
      VNEXT_COLLECTION_FILE_SUFFIXES.contexts
    ),
    loadVnextCollection<VnextActorSpec>(
      baseDir,
      index.model.actors,
      VNEXT_COLLECTION_FILE_SUFFIXES.actors
    ),
    loadVnextCollection<VnextSystemSpec>(
      baseDir,
      index.model.systems,
      VNEXT_COLLECTION_FILE_SUFFIXES.systems
    ),
    loadVnextCollection<VnextScenarioSpec>(
      baseDir,
      index.model.scenarios,
      VNEXT_COLLECTION_FILE_SUFFIXES.scenarios
    ),
    loadVnextCollection<VnextMessageSpec>(
      baseDir,
      index.model.messages,
      VNEXT_COLLECTION_FILE_SUFFIXES.messages
    ),
    loadVnextCollection<VnextAggregateSpec>(
      baseDir,
      index.model.aggregates,
      VNEXT_COLLECTION_FILE_SUFFIXES.aggregates
    ),
    loadVnextCollection<VnextPolicySpec>(
      baseDir,
      index.model.policies,
      VNEXT_COLLECTION_FILE_SUFFIXES.policies
    )
  ]);

  assertCanonicalVersion(
    index.version,
    VNEXT_CANONICAL_SCHEMA_VERSION,
    options.entryPath,
    "loadVnextBusinessSpec",
    "Use loadBusinessSpec() for version 2 canonicals."
  );

  const businessSpec: VnextBusinessSpec = {
    version: index.version,
    id: index.id,
    title: index.title,
    summary: index.summary,
    contexts,
    actors,
    systems,
    scenarios,
    messages,
    aggregates,
    policies
  };

  if (options.validateSemantics !== false) {
    validateBusinessSpecSemantics(businessSpec);
  }

  return businessSpec;
}

async function loadCanonicalVersion(entryPath: string): Promise<number | undefined> {
  const index = await loadYamlFile<{ version?: unknown }>(entryPath);

  return typeof index.version === "number" ? index.version : undefined;
}

async function loadMany<Value>(
  baseDir: string,
  relativePaths: readonly string[]
): Promise<Value[]> {
  return Promise.all(
    relativePaths.map((relativePath) => loadYamlFile<Value>(resolve(baseDir, relativePath)))
  );
}

async function loadVnextCollection<Value>(
  baseDir: string,
  reference: VnextCollectionRef,
  suffix: string
): Promise<Value[]> {
  const absolutePaths = await resolveVnextCollectionPaths(baseDir, reference, suffix);

  return Promise.all(absolutePaths.map((absolutePath) => loadYamlFile<Value>(absolutePath)));
}

async function resolveVnextCollectionPaths(
  baseDir: string,
  reference: VnextCollectionRef,
  suffix: string
): Promise<readonly string[]> {
  if (typeof reference === "string") {
    const absoluteDir = resolve(baseDir, reference);
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && matchesVnextCollectionFile(entry.name, suffix))
      .map((entry) => entry.name)
      .sort();

    return fileNames.map((fileName) => resolve(absoluteDir, fileName));
  }

  return reference.map((relativePath) => resolve(baseDir, relativePath));
}

function matchesVnextCollectionFile(fileName: string, suffix: string): boolean {
  return (
    fileName.endsWith(suffix) ||
    (suffix.endsWith(".yaml") && fileName.endsWith(suffix.replace(/yaml$/, "yml")))
  );
}

function assertCanonicalVersion(
  actualVersion: unknown,
  expectedVersion: number,
  entryPath: string,
  loaderName: string,
  hint: string
): void {
  if (actualVersion !== expectedVersion) {
    throw new Error(
      `${loaderName} expected version ${expectedVersion} canonical index at ${entryPath}, received ${String(actualVersion)}. ${hint}`
    );
  }
}

async function loadYamlFile<Value>(absolutePath: string): Promise<Value> {
  const source = await readFile(absolutePath, "utf8");

  return YAML.parse(source) as Value;
}
