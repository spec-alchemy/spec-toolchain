import { fileURLToPath } from "node:url";

export interface PackedCliTarball {
  packedPaths: readonly string[];
  tarballPath: string;
  tempDirPath: string;
}

function toAbsolutePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

export const CORE_SCHEMA_DIR_PATH = toAbsolutePath("../../ddd-spec-core/schema");
export const DEFAULT_VNEXT_SCHEMA_PATH = toAbsolutePath(
  "../../ddd-spec-core/schema/vnext/canonical-index.schema.json"
);
export const REPO_VIEWER_ENTRY_PATH = toAbsolutePath(
  "../../../examples/vnext-cross-context/canonical-vnext/index.yaml"
);
export const CLI_DIST_ENTRY_PATH = toAbsolutePath("../dist/ddd-spec-cli/cli.js");
export const CLI_DIST_INDEX_PATH = toAbsolutePath("../dist/ddd-spec-cli/index.js");
export const CLI_DIST_SCHEMA_DIR_PATH = toAbsolutePath("../dist/ddd-spec-core/schema");
export const CLI_DIST_SCHEMA_PATH = toAbsolutePath(
  "../dist/ddd-spec-core/schema/vnext/canonical-index.schema.json"
);
export const CLI_DIST_VIEWER_DIR_PATH = toAbsolutePath("../dist/ddd-spec-cli/static/viewer");
export const CLI_DIST_VIEWER_INDEX_PATH = toAbsolutePath(
  "../dist/ddd-spec-cli/static/viewer/index.html"
);
export const CLI_DIST_VIEWER_GENERATED_SPEC_PATH = toAbsolutePath(
  "../dist/ddd-spec-cli/static/viewer/generated/viewer-spec.json"
);
export const REPO_ROOT_PATH = toAbsolutePath("../../../");
export const REPO_ROOT_NODE_MODULES_PATH = toAbsolutePath("../../../node_modules");
export const REPO_VIEWER_CONFIG_PATH = toAbsolutePath(
  "../../../apps/ddd-spec-viewer/ddd-spec.config.yaml"
);
export const WORKSPACE_SCHEMA_DIR_RELATIVE_PATH = ".vscode/ddd-spec/schema";
export const SCHEMA_FILE_NAMES = [
  "vnext/canonical-index.schema.json",
  "vnext/context.schema.json",
  "vnext/actor.schema.json",
  "vnext/system.schema.json",
  "vnext/scenario.schema.json",
  "vnext/message.schema.json",
  "vnext/aggregate.schema.json",
  "vnext/policy.schema.json",
  "vnext/shared.schema.json"
] as const;
export const WORKSPACE_SCHEMA_FILE_NAMES = [
  "vnext/canonical-index.schema.json",
  "vnext/context.schema.json",
  "vnext/actor.schema.json",
  "vnext/system.schema.json",
  "vnext/scenario.schema.json",
  "vnext/message.schema.json",
  "vnext/aggregate.schema.json",
  "vnext/policy.schema.json",
  "vnext/shared.schema.json"
] as const;
