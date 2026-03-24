import { fileURLToPath } from "node:url";
import { validateBusinessSpecSchema as validateBusinessSpecSchemaWithCore } from "../../packages/ddd-spec-core/schema-validation.js";
import type { BusinessSpec } from "../../packages/ddd-spec-core/spec.js";

const schemaPath = fileURLToPath(new URL("../schema/business-spec.schema.json", import.meta.url));

export async function validateBusinessSpecSchema(spec: BusinessSpec): Promise<void> {
  await validateBusinessSpecSchemaWithCore(spec, { schemaPath });
}
