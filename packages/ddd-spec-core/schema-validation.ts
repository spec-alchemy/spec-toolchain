import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { ErrorObject } from "ajv";
import YAML from "yaml";
import {
  loadDomainModelIndexSpec,
  type CollectionRef
} from "./spec.js";

type AjvConstructor = new (options?: Record<string, unknown>) => {
  addSchema: (schema: object, key?: string) => void;
  compile: (schema: object) => {
    (data: unknown): boolean;
    errors?: ErrorObject[] | null;
  };
};

type JsonSchemaValidator = {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
};

export interface ValidateBusinessSpecSchemaOptions {
  schemaPath: string;
}

export interface ValidateDomainModelWorkspaceSchemaOptions {
  entryPath: string;
  schemaPath: string;
}

const DOMAIN_MODEL_COLLECTION_VALIDATION = {
  contexts: {
    schemaFileName: "context.schema.json",
    suffix: ".context.yaml"
  },
  actors: {
    schemaFileName: "actor.schema.json",
    suffix: ".actor.yaml"
  },
  systems: {
    schemaFileName: "system.schema.json",
    suffix: ".system.yaml"
  },
  scenarios: {
    schemaFileName: "scenario.schema.json",
    suffix: ".scenario.yaml"
  },
  messages: {
    schemaFileName: "message.schema.json",
    suffix: ".message.yaml"
  },
  aggregates: {
    schemaFileName: "aggregate.schema.json",
    suffix: ".aggregate.yaml"
  },
  policies: {
    schemaFileName: "policy.schema.json",
    suffix: ".policy.yaml"
  }
} as const;

const validatorBySchemaPath = new Map<string, Promise<JsonSchemaValidator>>();

export async function validateBusinessSpecSchema(
  spec: unknown,
  options: ValidateBusinessSpecSchemaOptions
): Promise<void> {
  const validate = await getSchemaValidator(options.schemaPath);

  if (!validate(spec)) {
    const messages = (validate.errors ?? [])
      .map((error: ErrorObject) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
      .join("\n");

    throw new Error(`Domain model schema validation failed:\n${messages}`);
  }
}

export async function validateDomainModelWorkspaceSchema(
  options: ValidateDomainModelWorkspaceSchemaOptions
): Promise<void> {
  const index = await loadDomainModelIndexSpec(options.entryPath);
  const schemaDirPath = dirname(options.schemaPath);
  const baseDir = dirname(options.entryPath);

  await validateBusinessSpecSchema(index, {
    schemaPath: options.schemaPath
  });

  for (const [collectionKey, config] of Object.entries(DOMAIN_MODEL_COLLECTION_VALIDATION)) {
    const reference = index.model[collectionKey as keyof typeof index.model];
    const absolutePaths = await resolveDomainModelCollectionPaths(baseDir, reference, config.suffix);

    for (const absolutePath of absolutePaths) {
      const source = await readFile(absolutePath, "utf8");
      const value = YAML.parse(source) as unknown;

      await validateBusinessSpecSchema(value, {
        schemaPath: join(schemaDirPath, config.schemaFileName)
      });
    }
  }
}

async function getSchemaValidator(schemaPath: string): Promise<JsonSchemaValidator> {
  const existingValidator = validatorBySchemaPath.get(schemaPath);

  if (existingValidator) {
    return existingValidator;
  }

  const createdValidator = createSchemaValidator(schemaPath);
  validatorBySchemaPath.set(schemaPath, createdValidator);

  return createdValidator;
}

async function createSchemaValidator(schemaPath: string): Promise<JsonSchemaValidator> {
  const schemaDirPath = dirname(schemaPath);
  const schemaFileName = basename(schemaPath);
  const [schemaSource, schemaFileNames] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readdir(schemaDirPath)
  ]);
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as AjvConstructor;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const siblingSchemaFileNames = schemaFileNames
    .filter((fileName) => fileName.endsWith(".json") && fileName !== schemaFileName)
    .sort();

  for (const fileName of siblingSchemaFileNames) {
    const siblingSchemaSource = await readFile(join(schemaDirPath, fileName), "utf8");
    ajv.addSchema(JSON.parse(siblingSchemaSource) as object);
  }

  return ajv.compile(JSON.parse(schemaSource) as object);
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
