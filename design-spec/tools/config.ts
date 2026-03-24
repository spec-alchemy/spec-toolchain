import { fileURLToPath } from "node:url";
import { loadDddSpecConfig, type ResolvedDddSpecConfig } from "../../packages/ddd-spec-cli/config.js";

export const repoRootPath = fileURLToPath(new URL("../..", import.meta.url));

let configPromise: Promise<ResolvedDddSpecConfig> | undefined;

export function loadDesignSpecConfig(): Promise<ResolvedDddSpecConfig> {
  if (!configPromise) {
    configPromise = loadDddSpecConfig({
      cwd: repoRootPath
    });
  }

  return configPromise;
}
