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

export interface SharedDiagnosticRelatedResource {
  family: string;
  kind: string;
  stableId: string;
  path?: string;
}

export interface SharedDiagnostic {
  severity: SharedDiagnosticSeverity;
  code: string;
  message: string;
  location: SharedDiagnosticLocation;
  related?: readonly SharedDiagnosticRelatedResource[];
}
