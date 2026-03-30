export const SHARED_STABLE_ID_VERSION = 1 as const;

export interface SharedStableId {
  family: string;
  kind: string;
  value: string;
  versionHint?: string;
}

