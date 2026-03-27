import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

export const DEFAULT_VNEXT_SCHEMA_PATH = fileURLToPath(
  new URL("../ddd-spec-core/schema/vnext/canonical-index.schema.json", import.meta.url)
);
export const ZERO_CONFIG_ENTRY_PATH = "domain-model/index.yaml";
export const ZERO_CONFIG_ARTIFACTS_DIR = ".ddd-spec/artifacts";
export const ZERO_CONFIG_GENERATED_DIR = ".ddd-spec/generated";
export const ZERO_CONFIG_SOURCE_DESCRIPTION = "zero-config defaults";

interface RawDddSpecConfig {
  version?: unknown;
  spec?: {
    entry?: unknown;
  };
  schema?: {
    path?: unknown;
  };
  outputs?: {
    rootDir?: unknown;
    bundle?: unknown;
    analysis?: unknown;
    viewer?: unknown;
    typescript?: unknown;
  };
  viewer?: {
    syncTargets?: unknown;
  };
  projections?: {
    viewer?: unknown;
    typescript?: unknown;
  };
}

export interface LoadDddSpecConfigOptions {
  configPath?: string;
  cwd?: string;
}

export interface DddSpecConfig {
  version: 1;
  spec: {
    entry: string;
  };
  schema?: {
    path?: string;
  };
  outputs?: {
    rootDir?: string;
    bundle?: string;
    analysis?: string;
    viewer?: string;
    typescript?: string;
  };
  viewer?: {
    syncTargets?: string[];
  };
  projections?: {
    viewer?: boolean;
    typescript?: boolean;
  };
}

export interface ResolvedDddSpecConfig {
  version: 1;
  mode: "config" | "zero-config";
  configPath?: string;
  sourceDescription: string;
  rootDir: string;
  spec: {
    entryPath: string;
  };
  schema: {
    path: string;
  };
  outputs: {
    rootDirPath?: string;
    bundlePath?: string;
    analysisPath?: string;
    viewerPath?: string;
    typescriptPath?: string;
  };
  viewer: {
    syncTargetPaths: readonly string[];
  };
  projections: {
    viewer: boolean;
    typescript: boolean;
  };
}

export async function loadDddSpecConfig(
  options: LoadDddSpecConfigOptions = {}
): Promise<ResolvedDddSpecConfig> {
  const cwd = resolve(options.cwd ?? process.cwd());

  if (!options.configPath) {
    return loadZeroConfig(cwd);
  }

  const configPath = resolve(cwd, options.configPath);
  const configDir = dirname(configPath);
  const source = await readFile(configPath, "utf8");
  const rawConfig = YAML.parse(source) as RawDddSpecConfig | null;

  if (!isRecord(rawConfig)) {
    throw new Error(`DDD spec config at ${configPath} must be a YAML object`);
  }

  const version = rawConfig.version;

  if (version !== 1) {
    throw new Error(
      `DDD spec config at ${configPath} must declare version: 1`
    );
  }

  const specConfig = requireRecord(rawConfig, "spec", configPath);
  const outputsConfig = optionalRecord(rawConfig, "outputs", configPath);
  const schemaConfig = optionalRecord(rawConfig, "schema", configPath);
  const viewerConfig = optionalRecord(rawConfig, "viewer", configPath);
  const projectionsConfig = optionalRecord(rawConfig, "projections", configPath);

  const rootDirPath = resolveOptionalPath(
    configDir,
    requireOptionalString(outputsConfig, "rootDir", configPath)
  );

  return {
    version,
    mode: "config",
    configPath,
    sourceDescription: configPath,
    rootDir: configDir,
    spec: {
      entryPath: resolvePath(
        configDir,
        requireString(specConfig, "entry", `${configPath} spec`)
      )
    },
    schema: {
      path: resolveOptionalPath(
        configDir,
        requireOptionalString(schemaConfig, "path", configPath)
      ) ?? DEFAULT_VNEXT_SCHEMA_PATH
    },
    outputs: {
      rootDirPath,
      bundlePath:
        resolveOptionalPath(
          configDir,
          requireOptionalString(outputsConfig, "bundle", configPath)
        ) ?? (rootDirPath ? resolve(rootDirPath, "business-spec.json") : undefined),
      analysisPath:
        resolveOptionalPath(
          configDir,
          requireOptionalString(outputsConfig, "analysis", configPath)
        ) ?? (rootDirPath ? resolve(rootDirPath, "business-spec.analysis.json") : undefined),
      viewerPath:
        resolveOptionalPath(
          configDir,
          requireOptionalString(outputsConfig, "viewer", configPath)
        ) ??
        (rootDirPath ? resolve(rootDirPath, "business-viewer/viewer-spec.json") : undefined),
      typescriptPath: resolveOptionalPath(
        configDir,
        requireOptionalString(outputsConfig, "typescript", configPath)
      )
    },
    viewer: {
      syncTargetPaths: requireStringArray(
        viewerConfig,
        "syncTargets",
        configPath
      ).map((targetPath) => resolvePath(configDir, targetPath))
    },
    projections: {
      viewer:
        requireOptionalBoolean(projectionsConfig, "viewer", configPath) ??
        Boolean(
          resolveOptionalPath(
            configDir,
            requireOptionalString(outputsConfig, "viewer", configPath)
          ) ?? rootDirPath
        ),
      typescript:
        requireOptionalBoolean(projectionsConfig, "typescript", configPath) ??
        Boolean(
          resolveOptionalPath(
            configDir,
            requireOptionalString(outputsConfig, "typescript", configPath)
          )
      )
    }
  };
}

async function loadZeroConfig(cwd: string): Promise<ResolvedDddSpecConfig> {
  const entryPath = resolve(cwd, ZERO_CONFIG_ENTRY_PATH);

  if (!(await pathExists(entryPath))) {
    throw new Error(
      `No domain model found at ${resolve(cwd, ZERO_CONFIG_ENTRY_PATH)}. Run \`ddd-spec init\` to create ${ZERO_CONFIG_ENTRY_PATH} before running this command.`
    );
  }

  const artifactsDirPath = resolve(cwd, ZERO_CONFIG_ARTIFACTS_DIR);

  return {
    version: 1,
    mode: "zero-config",
    sourceDescription: ZERO_CONFIG_SOURCE_DESCRIPTION,
    rootDir: cwd,
    spec: {
      entryPath
    },
    schema: {
      path: DEFAULT_VNEXT_SCHEMA_PATH
    },
    outputs: {
      rootDirPath: artifactsDirPath,
      bundlePath: resolve(artifactsDirPath, "business-spec.json"),
      analysisPath: resolve(artifactsDirPath, "business-spec.analysis.json"),
      viewerPath: resolve(artifactsDirPath, "viewer-spec.json"),
      typescriptPath: resolve(cwd, ZERO_CONFIG_GENERATED_DIR, "business-spec.generated.ts")
    },
    viewer: {
      syncTargetPaths: []
    },
    projections: {
      viewer: true,
      typescript: false
    }
  };
}

function resolveOptionalPath(baseDir: string, relativePath?: string): string | undefined {
  return relativePath ? resolvePath(baseDir, relativePath) : undefined;
}

function resolvePath(baseDir: string, relativePath: string): string {
  return resolve(baseDir, relativePath);
}

function requireRecord(
  value: Record<string, unknown>,
  key: string,
  contextPath: string
): Record<string, unknown> {
  const nestedValue = value[key];

  if (!isRecord(nestedValue)) {
    throw new Error(`DDD spec config at ${contextPath} requires an object at ${key}`);
  }

  return nestedValue;
}

function optionalRecord(
  value: Record<string, unknown>,
  key: string,
  contextPath: string
): Record<string, unknown> | undefined {
  const nestedValue = value[key];

  if (nestedValue === undefined) {
    return undefined;
  }

  if (!isRecord(nestedValue)) {
    throw new Error(`DDD spec config at ${contextPath} expects ${key} to be an object`);
  }

  return nestedValue;
}

function requireString(
  value: Record<string, unknown>,
  key: string,
  contextPath: string
): string {
  const nestedValue = value[key];

  if (typeof nestedValue !== "string" || nestedValue.length === 0) {
    throw new Error(`DDD spec config at ${contextPath} requires a non-empty string at ${key}`);
  }

  return nestedValue;
}

function requireOptionalString(
  value: Record<string, unknown> | undefined,
  key: string,
  contextPath: string
): string | undefined {
  if (!value || value[key] === undefined) {
    return undefined;
  }

  if (typeof value[key] !== "string" || (value[key] as string).length === 0) {
    throw new Error(`DDD spec config at ${contextPath} expects ${key} to be a non-empty string`);
  }

  return value[key] as string;
}

function requireOptionalBoolean(
  value: Record<string, unknown> | undefined,
  key: string,
  contextPath: string
): boolean | undefined {
  if (!value || value[key] === undefined) {
    return undefined;
  }

  if (typeof value[key] !== "boolean") {
    throw new Error(`DDD spec config at ${contextPath} expects ${key} to be a boolean`);
  }

  return value[key] as boolean;
}

function requireStringArray(
  value: Record<string, unknown> | undefined,
  key: string,
  contextPath: string
): string[] {
  if (!value || value[key] === undefined) {
    return [];
  }

  if (!Array.isArray(value[key]) || !value[key].every((item) => typeof item === "string")) {
    throw new Error(`DDD spec config at ${contextPath} expects ${key} to be a string array`);
  }

  return value[key] as string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
