import type { SharedStableId } from "./stable-identity.ts";

export const SHARED_REFERENCE_VERSION = 1 as const;

export interface SharedReference {
  target: SharedStableId;
  path?: string;
}
