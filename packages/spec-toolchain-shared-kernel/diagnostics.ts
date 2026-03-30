import type { SharedReference } from "./reference.ts";

export const SHARED_DIAGNOSTIC_VERSION = 1 as const;

export const SHARED_DIAGNOSTIC_SEVERITIES = [
  "error",
  "warning",
  "info"
] as const;

export type SharedDiagnosticSeverity =
  (typeof SHARED_DIAGNOSTIC_SEVERITIES)[number];

export interface SharedDiagnosticLocation {
  path: string;
  sourceAsset?: string;
}

export interface SharedDiagnosticRelatedResource extends SharedReference {}

export interface SharedDiagnostic {
  severity: SharedDiagnosticSeverity;
  code: string;
  message: string;
  location: SharedDiagnosticLocation;
  related?: readonly SharedDiagnosticRelatedResource[];
}

export const SHARED_INVALID_REFERENCE_DIAGNOSTIC_CODE =
  "invalid-reference" as const;

export interface SharedInvalidReferenceDiagnostic extends SharedDiagnostic {
  code: typeof SHARED_INVALID_REFERENCE_DIAGNOSTIC_CODE;
  invalidReference: SharedReference;
}
