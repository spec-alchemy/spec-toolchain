import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { ErrorObject } from "ajv";
import type { BusinessSpec } from "./spec.js";

type AjvConstructor = new (options?: Record<string, unknown>) => {
  compile: (schema: object) => {
    (data: unknown): boolean;
    errors?: ErrorObject[] | null;
  };
};

const schemaPath = fileURLToPath(new URL("../schema/business-spec.schema.json", import.meta.url));
let schemaValidatorPromise:
  | Promise<{
      (data: unknown): boolean;
      errors?: ErrorObject[] | null;
    }>
  | undefined;

export async function validateBusinessSpecSchema(spec: BusinessSpec): Promise<void> {
  const validate = await getSchemaValidator();

  if (!validate(spec)) {
    const messages = (validate.errors ?? [])
      .map((error: ErrorObject) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
      .join("\n");

    throw new Error(`Business spec schema validation failed:\n${messages}`);
  }
}

async function getSchemaValidator(): Promise<{
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
}> {
  if (!schemaValidatorPromise) {
    schemaValidatorPromise = createSchemaValidator();
  }

  return schemaValidatorPromise;
}

async function createSchemaValidator(): Promise<{
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
}> {
  const schemaSource = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaSource) as object;
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as AjvConstructor;
  const ajv = new Ajv2020({ allErrors: true, strict: false });

  return ajv.compile(schema);
}
