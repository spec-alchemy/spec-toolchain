import type { VnextBusinessSpec } from "./spec.js";
import { validateVnextBusinessSpecSemantics } from "./vnext-semantic-validation.js";

export function validateBusinessSpecSemantics(spec: VnextBusinessSpec): void {
  validateVnextBusinessSpecSemantics(spec);
}
