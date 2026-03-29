export const SHARED_ARTIFACT_MANIFEST_VERSION = 1 as const;

export const SHARED_ARTIFACT_ROLES = [
  "analysis",
  "generation",
  "viewer",
  "diagnostics",
  "other"
] as const;

export type SharedArtifactRole = (typeof SHARED_ARTIFACT_ROLES)[number];

export interface SharedArtifactLocator {
  relativePath: string;
  mediaType?: string;
}

export interface SharedArtifactManifestEntry {
  id: string;
  family: string;
  kind: string;
  role: SharedArtifactRole;
  locator: SharedArtifactLocator;
  sourceIds?: readonly string[];
}

export interface SharedArtifactManifest {
  manifestVersion: typeof SHARED_ARTIFACT_MANIFEST_VERSION;
  artifacts: readonly SharedArtifactManifestEntry[];
}
