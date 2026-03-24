import { fileURLToPath } from "node:url";
import { loadDddSpecConfig, type ResolvedDddSpecConfig } from "../../packages/ddd-spec-cli/config.js";

export const designSpecConfigPath = fileURLToPath(
  new URL("../../ddd-spec.config.yaml", import.meta.url)
);

let configPromise: Promise<ResolvedDddSpecConfig> | undefined;

export function loadDesignSpecConfig(): Promise<ResolvedDddSpecConfig> {
  if (!configPromise) {
    configPromise = loadDddSpecConfig({
      configPath: designSpecConfigPath
    });
  }

  return configPromise;
}
