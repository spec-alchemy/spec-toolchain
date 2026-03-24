import { validateBusinessSpecSchema as validateBusinessSpecSchemaWithCore } from "../../packages/ddd-spec-core/schema-validation.js";
import type { BusinessSpec } from "../../packages/ddd-spec-core/spec.js";
import { loadDesignSpecConfig } from "./config.js";

export async function validateBusinessSpecSchema(spec: BusinessSpec): Promise<void> {
  const config = await loadDesignSpecConfig();

  await validateBusinessSpecSchemaWithCore(spec, { schemaPath: config.schema.path });
}
