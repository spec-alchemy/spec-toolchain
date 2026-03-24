import { readFile } from "node:fs/promises";
import type { ErrorObject } from "ajv";
import type { BusinessSpec } from "./spec.js";

type AjvConstructor = new (options?: Record<string, unknown>) => {
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

const validatorBySchemaPath = new Map<string, Promise<JsonSchemaValidator>>();

export async function validateBusinessSpecSchema(
  spec: BusinessSpec,
  options: ValidateBusinessSpecSchemaOptions
): Promise<void> {
  const validate = await getSchemaValidator(options.schemaPath);

  if (!validate(spec)) {
    const messages = (validate.errors ?? [])
      .map((error: ErrorObject) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
      .join("\n");

    throw new Error(`Business spec schema validation failed:\n${messages}`);
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
  const schemaSource = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaSource) as object;
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as AjvConstructor;
  const ajv = new Ajv2020({ allErrors: true, strict: false });

  return ajv.compile(schema);
}
