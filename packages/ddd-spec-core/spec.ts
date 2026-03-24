import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import { validateBusinessSpecSemantics } from "./semantic-validation.js";

export interface FieldSpec {
  id: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface PayloadSpec {
  fields: readonly FieldSpec[];
}

export interface ObjectSpec {
  kind: "object";
  id: string;
  title: string;
  lifecycleField: string;
  lifecycle: readonly string[];
  fields: readonly FieldSpec[];
}

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
  version: number;
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
  version: number;
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

export async function loadBusinessSpec(
  options: LoadBusinessSpecOptions
): Promise<BusinessSpec> {
  const index = await loadYamlFile<CanonicalIndexSpec>(options.entryPath);
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
