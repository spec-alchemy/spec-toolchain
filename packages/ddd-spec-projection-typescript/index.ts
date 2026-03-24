import type { BusinessSpec } from "../ddd-spec-core/spec.js";

export function buildBusinessSpecTypescriptSource(spec: BusinessSpec): string {
  return [
    "// This file is auto-generated. Do not edit by hand.",
    "",
    `export const businessSpec = ${JSON.stringify(spec, null, 2)} as const;`,
    ""
  ].join("\n");
}
