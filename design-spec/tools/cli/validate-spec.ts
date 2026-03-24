import { validateBusinessSpecSchema } from "../schema-validation.js";
import { loadBusinessSpec } from "../spec.js";

const businessSpec = await loadBusinessSpec();

await validateBusinessSpecSchema(businessSpec);

console.log("Business spec validation passed");
