import type { SharedReference } from "./reference.ts";

export const SHARED_PROVENANCE_VERSION = 1 as const;

export const SHARED_PROVENANCE_DERIVATION_KINDS = [
  "associated-with",
  "derived-from",
  "aggregated-from"
] as const;

export type SharedProvenanceDerivationKind =
  (typeof SHARED_PROVENANCE_DERIVATION_KINDS)[number];

export interface SharedProvenanceSubject {
  artifactId: string;
  outputId?: string;
  path?: string;
}

export interface SharedProvenanceSourceLink {
  derivationKind: SharedProvenanceDerivationKind;
  source: SharedReference;
}

export interface SharedProvenanceRecord {
  subject: SharedProvenanceSubject;
  upstream: readonly SharedProvenanceSourceLink[];
}
