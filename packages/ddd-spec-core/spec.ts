import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import { validateBusinessSpecSemantics } from "./semantic-validation.js";

export const DOMAIN_MODEL_SCHEMA_VERSION = 1 as const;

export const RESOURCE_KINDS = [
  "context",
  "actor",
  "system",
  "scenario",
  "message",
  "aggregate",
  "policy"
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const ACTOR_TYPES = ["person", "role", "team"] as const;

export type ActorType = (typeof ACTOR_TYPES)[number];

export const SYSTEM_BOUNDARIES = ["internal", "external"] as const;

export type SystemBoundary = (typeof SYSTEM_BOUNDARIES)[number];

export const MESSAGE_KINDS = ["command", "event", "query"] as const;

export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_CHANNELS = ["sync", "async"] as const;

export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const CONTEXT_RELATIONSHIP_DIRECTIONS = [
  "upstream",
  "downstream",
  "bidirectional"
] as const;

export type ContextRelationshipDirection =
  (typeof CONTEXT_RELATIONSHIP_DIRECTIONS)[number];

export type CollectionRef = string | readonly string[];

export interface ResourceRef {
  kind: ResourceKind;
  id: string;
}

export interface PayloadFieldSpec {
  id: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ContextRelationshipSpec {
  id: string;
  kind: string;
  target: ResourceRef;
  direction?: ContextRelationshipDirection;
  integration?: string;
  description?: string;
}

export interface ContextSpec {
  kind: "context";
  id: string;
  title: string;
  summary: string;
  owners: readonly string[];
  responsibilities: readonly string[];
  relationships?: readonly ContextRelationshipSpec[];
}

export interface ActorSpec {
  kind: "actor";
  id: string;
  title: string;
  summary: string;
  actorType?: ActorType;
}

export interface SystemSpec {
  kind: "system";
  id: string;
  title: string;
  summary: string;
  boundary?: SystemBoundary;
  capabilities?: readonly string[];
}

export interface ScenarioStepSpec {
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

export interface ScenarioSpec {
  kind: "scenario";
  id: string;
  title: string;
  summary: string;
  goal: string;
  ownerContext: string;
  steps: readonly ScenarioStepSpec[];
}

export interface MessageSpec {
  kind: "message";
  id: string;
  title: string;
  summary: string;
  messageKind: MessageKind;
  channel?: MessageChannel;
  producers: readonly ResourceRef[];
  consumers: readonly ResourceRef[];
  payload?: readonly PayloadFieldSpec[];
}

export interface AggregateTransitionSpec {
  id: string;
  from: string;
  to: string;
  onMessage: string;
  emits?: readonly string[];
}

export interface AggregateSpec {
  kind: "aggregate";
  id: string;
  title: string;
  summary: string;
  context: string;
  lifecycleComplexity?: boolean;
  states: readonly string[];
  initialState: string;
  transitions: readonly AggregateTransitionSpec[];
}

export interface PolicySpec {
  kind: "policy";
  id: string;
  title: string;
  summary: string;
  context?: string;
  triggerMessages: readonly string[];
  emittedMessages?: readonly string[];
  targetSystems?: readonly string[];
  coordinates?: readonly ResourceRef[];
}

export interface BusinessSpec {
  version: typeof DOMAIN_MODEL_SCHEMA_VERSION;
  id: string;
  title: string;
  summary: string;
  contexts: readonly ContextSpec[];
  actors: readonly ActorSpec[];
  systems: readonly SystemSpec[];
  scenarios: readonly ScenarioSpec[];
  messages: readonly MessageSpec[];
  aggregates: readonly AggregateSpec[];
  policies: readonly PolicySpec[];
}

export interface DomainModelIndexSpec {
  version: typeof DOMAIN_MODEL_SCHEMA_VERSION;
  id: string;
  title: string;
  summary: string;
  model: {
    contexts: CollectionRef;
    actors: CollectionRef;
    systems: CollectionRef;
    scenarios: CollectionRef;
    messages: CollectionRef;
    aggregates: CollectionRef;
    policies: CollectionRef;
  };
}

export type LoadedBusinessSpec = BusinessSpec;

export interface LoadBusinessSpecOptions {
  entryPath: string;
  validateSemantics?: boolean;
}

export interface LoadCanonicalSpecOptions extends LoadBusinessSpecOptions {}

const DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES = {
  contexts: ".context.yaml",
  actors: ".actor.yaml",
  systems: ".system.yaml",
  scenarios: ".scenario.yaml",
  messages: ".message.yaml",
  aggregates: ".aggregate.yaml",
  policies: ".policy.yaml"
} as const;

export function isBusinessSpec(spec: unknown): spec is BusinessSpec {
  return (
    typeof spec === "object" &&
    spec !== null &&
    "version" in spec &&
    (spec as { version?: unknown }).version === DOMAIN_MODEL_SCHEMA_VERSION
  );
}

export async function loadDomainModelIndexSpec(
  entryPath: string
): Promise<DomainModelIndexSpec> {
  return loadYamlFile<DomainModelIndexSpec>(entryPath);
}

export async function loadCanonicalSpec(
  options: LoadCanonicalSpecOptions
): Promise<BusinessSpec> {
  const version = await loadCanonicalVersion(options.entryPath);

  if (version !== DOMAIN_MODEL_SCHEMA_VERSION) {
    throw new Error(
      formatUnsupportedCanonicalVersionMessage(version, options.entryPath)
    );
  }

  return loadBusinessSpec(options);
}

export async function loadBusinessSpec(
  options: LoadBusinessSpecOptions
): Promise<BusinessSpec> {
  const index = await loadDomainModelIndexSpec(options.entryPath);
  assertCanonicalModelContainer(
    index as { model?: unknown; domain?: unknown },
    options.entryPath,
    "loadBusinessSpec"
  );
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
    loadDomainModelCollection<ContextSpec>(
      baseDir,
      index.model.contexts,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.contexts
    ),
    loadDomainModelCollection<ActorSpec>(
      baseDir,
      index.model.actors,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.actors
    ),
    loadDomainModelCollection<SystemSpec>(
      baseDir,
      index.model.systems,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.systems
    ),
    loadDomainModelCollection<ScenarioSpec>(
      baseDir,
      index.model.scenarios,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.scenarios
    ),
    loadDomainModelCollection<MessageSpec>(
      baseDir,
      index.model.messages,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.messages
    ),
    loadDomainModelCollection<AggregateSpec>(
      baseDir,
      index.model.aggregates,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.aggregates
    ),
    loadDomainModelCollection<PolicySpec>(
      baseDir,
      index.model.policies,
      DOMAIN_MODEL_COLLECTION_FILE_SUFFIXES.policies
    )
  ]);

  assertCanonicalVersion(index.version, options.entryPath, "loadBusinessSpec");

  const businessSpec: BusinessSpec = {
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

async function loadDomainModelCollection<Value>(
  baseDir: string,
  reference: CollectionRef,
  suffix: string
): Promise<Value[]> {
  const absolutePaths = await resolveDomainModelCollectionPaths(baseDir, reference, suffix);

  return Promise.all(absolutePaths.map((absolutePath) => loadYamlFile<Value>(absolutePath)));
}

async function resolveDomainModelCollectionPaths(
  baseDir: string,
  reference: CollectionRef,
  suffix: string
): Promise<readonly string[]> {
  if (typeof reference === "string") {
    const absoluteDir = resolve(baseDir, reference);
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile() && matchesDomainModelCollectionFile(entry.name, suffix))
      .map((entry) => entry.name)
      .sort();

    return fileNames.map((fileName) => resolve(absoluteDir, fileName));
  }

  return reference.map((relativePath) => resolve(baseDir, relativePath));
}

function matchesDomainModelCollectionFile(fileName: string, suffix: string): boolean {
  return (
    fileName.endsWith(suffix) ||
    (suffix.endsWith(".yaml") && fileName.endsWith(suffix.replace(/yaml$/, "yml")))
  );
}

function assertCanonicalVersion(
  actualVersion: unknown,
  entryPath: string,
  loaderName: string
): void {
  if (actualVersion !== DOMAIN_MODEL_SCHEMA_VERSION) {
    throw new Error(
      `${loaderName} expected version ${DOMAIN_MODEL_SCHEMA_VERSION} domain model index at ${entryPath}, received ${String(actualVersion)}.`
    );
  }
}

function assertCanonicalModelContainer(
  index: { model?: unknown; domain?: unknown },
  entryPath: string,
  loaderName: string
): void {
  if (typeof index.model === "object" && index.model !== null) {
    return;
  }

  if ("domain" in index) {
    throw new Error(
      `${loaderName} expected top-level \`model\` at ${entryPath}. Legacy top-level \`domain\` is no longer supported in version ${DOMAIN_MODEL_SCHEMA_VERSION} domain models.`
    );
  }

  throw new Error(
    `${loaderName} expected top-level \`model\` at ${entryPath}.`
  );
}

function formatUnsupportedCanonicalVersionMessage(
  version: number | undefined,
  entryPath: string
): string {
  if (version === 3) {
    return (
      `Unsupported domain model schema version 3 at ${entryPath}. ` +
      "ddd-spec reset the default model schema to version 1. The default workspace now starts at domain-model/index.yaml with version: 1, and legacy version 3 workspaces are no longer supported."
    );
  }

  return (
    `Unsupported domain model schema version ${String(version)} at ${entryPath}. ` +
    `ddd-spec only supports domain models with version: ${DOMAIN_MODEL_SCHEMA_VERSION}.`
  );
}

async function loadYamlFile<Value>(absolutePath: string): Promise<Value> {
  const source = await readFile(absolutePath, "utf8");

  return YAML.parse(source) as Value;
}
