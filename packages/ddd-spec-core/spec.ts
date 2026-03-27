import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import { validateBusinessSpecSemantics } from "./semantic-validation.js";

export const VNEXT_CANONICAL_SCHEMA_VERSION = 1 as const;

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

export type LoadedBusinessSpec = VnextBusinessSpec;

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

export function isVnextBusinessSpec(spec: unknown): spec is VnextBusinessSpec {
  return (
    typeof spec === "object" &&
    spec !== null &&
    "version" in spec &&
    (spec as { version?: unknown }).version === VNEXT_CANONICAL_SCHEMA_VERSION
  );
}

export async function loadVnextCanonicalIndexSpec(
  entryPath: string
): Promise<VnextCanonicalIndexSpec> {
  return loadYamlFile<VnextCanonicalIndexSpec>(entryPath);
}

export async function loadCanonicalSpec(
  options: LoadCanonicalSpecOptions
): Promise<VnextBusinessSpec> {
  const version = await loadCanonicalVersion(options.entryPath);

  if (version !== VNEXT_CANONICAL_SCHEMA_VERSION) {
    throw new Error(
      formatUnsupportedCanonicalVersionMessage(version, options.entryPath)
    );
  }

  return loadVnextBusinessSpec(options);
}

export async function loadVnextBusinessSpec(
  options: LoadVnextBusinessSpecOptions
): Promise<VnextBusinessSpec> {
  const index = await loadVnextCanonicalIndexSpec(options.entryPath);
  assertCanonicalModelContainer(
    index as { model?: unknown; domain?: unknown },
    options.entryPath,
    "loadVnextBusinessSpec"
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

  assertCanonicalVersion(index.version, options.entryPath, "loadVnextBusinessSpec");

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
  entryPath: string,
  loaderName: string
): void {
  if (actualVersion !== VNEXT_CANONICAL_SCHEMA_VERSION) {
    throw new Error(
      `${loaderName} expected version ${VNEXT_CANONICAL_SCHEMA_VERSION} domain model index at ${entryPath}, received ${String(actualVersion)}.`
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
      `${loaderName} expected top-level \`model\` at ${entryPath}. Legacy top-level \`domain\` is no longer supported in version ${VNEXT_CANONICAL_SCHEMA_VERSION} domain models.`
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
    `ddd-spec only supports domain models with version: ${VNEXT_CANONICAL_SCHEMA_VERSION}.`
  );
}

async function loadYamlFile<Value>(absolutePath: string): Promise<Value> {
  const source = await readFile(absolutePath, "utf8");

  return YAML.parse(source) as Value;
}
