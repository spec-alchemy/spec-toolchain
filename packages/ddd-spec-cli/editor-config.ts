import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyEdits,
  modify,
  parse,
  printParseErrorCode,
  type FormattingOptions,
  type ParseError
} from "jsonc-parser";
import picomatch from "picomatch";

type ConfigWriteStatus = "created" | "updated" | "unchanged" | "skipped";

export interface EnsureVsCodeWorkspaceConfigResult {
  schemaDirPath: string;
  schemaAssetsStatus: ConfigWriteStatus;
  settingsPath: string;
  settingsStatus: ConfigWriteStatus;
  extensionsPath: string;
  extensionsStatus: ConfigWriteStatus;
  warnings: readonly string[];
}

const JSONC_FORMATTING: FormattingOptions = {
  insertSpaces: true,
  tabSize: 2,
  eol: "\n"
};

const SCHEMA_DIR_PATH = fileURLToPath(new URL("../ddd-spec-core/schema", import.meta.url));
const WORKSPACE_SCHEMA_DIR = [".vscode", "ddd-spec", "schema"] as const;
const YAML_EXTENSION_RECOMMENDATION = "redhat.vscode-yaml";
const SCHEMA_FILE_NAMES = [
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
const SCHEMA_MAPPINGS = [
  {
    schemaFile: "vnext/canonical-index.schema.json",
    globs: ["**/canonical-vnext/index.yaml"]
  },
  {
    schemaFile: "vnext/context.schema.json",
    globs: ["**/canonical-vnext/contexts/*.context.yaml"]
  },
  {
    schemaFile: "vnext/actor.schema.json",
    globs: ["**/canonical-vnext/actors/*.actor.yaml"]
  },
  {
    schemaFile: "vnext/system.schema.json",
    globs: ["**/canonical-vnext/systems/*.system.yaml"]
  },
  {
    schemaFile: "vnext/scenario.schema.json",
    globs: ["**/canonical-vnext/scenarios/*.scenario.yaml"]
  },
  {
    schemaFile: "vnext/message.schema.json",
    globs: ["**/canonical-vnext/messages/*.message.yaml"]
  },
  {
    schemaFile: "vnext/aggregate.schema.json",
    globs: ["**/canonical-vnext/aggregates/*.aggregate.yaml"]
  },
  {
    schemaFile: "vnext/policy.schema.json",
    globs: ["**/canonical-vnext/policies/*.policy.yaml"]
  }
] as const;

export async function ensureVsCodeWorkspaceConfig(
  rootPath: string
): Promise<EnsureVsCodeWorkspaceConfigResult> {
  const schemaDirPath = resolve(rootPath, ...WORKSPACE_SCHEMA_DIR);
  const settingsPath = resolve(rootPath, ".vscode", "settings.json");
  const extensionsPath = resolve(rootPath, ".vscode", "extensions.json");
  const warnings: string[] = [];
  const schemaAssetsStatus = await ensureWorkspaceSchemaAssets(schemaDirPath);
  const workspaceCanonicalFilePaths = await collectWorkspaceCanonicalFilePaths(rootPath);
  const desiredMappings = SCHEMA_MAPPINGS.map((mapping) => {
    const workspaceSchemaPath = toWorkspaceRelativePath(
      rootPath,
      resolve(schemaDirPath, mapping.schemaFile)
    );

    return {
      schemaPath: workspaceSchemaPath,
      globs: [...mapping.globs],
      workspaceTargetPaths: workspaceCanonicalFilePaths.filter((workspaceFilePath) =>
        matchesAnyGlob(mapping.globs, workspaceFilePath)
      )
    };
  });
  const settingsStatus = await ensureYamlSchemaSettings(
    settingsPath,
    desiredMappings,
    warnings
  );
  const extensionsStatus = await ensureExtensionRecommendations(
    extensionsPath,
    [YAML_EXTENSION_RECOMMENDATION],
    warnings
  );

  return {
    schemaDirPath,
    schemaAssetsStatus,
    settingsPath,
    settingsStatus,
    extensionsPath,
    extensionsStatus,
    warnings
  };
}

async function ensureYamlSchemaSettings(
  settingsPath: string,
  desiredMappings: readonly DesiredSchemaMapping[],
  warnings: string[]
): Promise<ConfigWriteStatus> {
  const existing = await readJsoncObject(settingsPath, warnings);

  if (existing.status !== "ok") {
    return "skipped";
  }

  const currentSchemas = existing.value["yaml.schemas"];

  if (currentSchemas !== undefined && !isRecord(currentSchemas)) {
    warnings.push(
      `Skipped VS Code YAML schema setup because ${settingsPath} has a non-object "yaml.schemas" value.`
    );
    return "skipped";
  }

  const currentSchemaMappings = isRecord(currentSchemas) ? currentSchemas : undefined;
  const mergedSchemas: Record<string, unknown> = currentSchemaMappings
    ? { ...currentSchemaMappings }
    : {};
  let changed = false;

  for (const mapping of desiredMappings) {
    const { globs: desiredGlobs, schemaPath, workspaceTargetPaths } = mapping;
    const currentGlobs = currentSchemaMappings
      ? normalizeSchemaGlobs(currentSchemaMappings[schemaPath])
      : [];

    if (currentSchemaMappings?.[schemaPath] !== undefined && currentGlobs === undefined) {
      warnings.push(
        `Skipped VS Code YAML schema entry ${schemaPath} because ${settingsPath} already uses an unsupported value type there.`
      );
      continue;
    }

    const nextGlobs = [...(currentGlobs ?? [])];

    for (const desiredGlob of desiredGlobs) {
      if (nextGlobs.includes(desiredGlob)) {
        continue;
      }

      const conflictingSchemaPath = findConflictingSchemaPath(
        mergedSchemas,
        schemaPath,
        desiredGlob,
        workspaceTargetPaths
      );

      if (conflictingSchemaPath) {
        warnings.push(
          `Skipped VS Code YAML schema glob ${desiredGlob} because ${settingsPath} already maps it to ${conflictingSchemaPath}.`
        );
        continue;
      }

      nextGlobs.push(desiredGlob);
      changed = true;
    }

    if (nextGlobs.length === 0) {
      continue;
    }

    if (!currentSchemaMappings || currentSchemaMappings[schemaPath] === undefined) {
      changed = true;
      mergedSchemas[schemaPath] = nextGlobs;
      continue;
    }

    if (!arraysEqual(currentGlobs ?? [], nextGlobs)) {
      changed = true;
      mergedSchemas[schemaPath] = nextGlobs;
    }
  }

  if (existing.exists && !changed) {
    return "unchanged";
  }

  return writeJsoncTopLevelProperty(settingsPath, existing, "yaml.schemas", mergedSchemas);
}

async function ensureExtensionRecommendations(
  extensionsPath: string,
  desiredRecommendations: readonly string[],
  warnings: string[]
): Promise<ConfigWriteStatus> {
  const existing = await readJsoncObject(extensionsPath, warnings);

  if (existing.status !== "ok") {
    return "skipped";
  }

  const currentRecommendations = normalizeStringArray(existing.value.recommendations);

  if (existing.value.recommendations !== undefined && currentRecommendations === undefined) {
    warnings.push(
      `Skipped VS Code extension recommendations because ${extensionsPath} has a non-array "recommendations" value.`
    );
    return "skipped";
  }

  const mergedRecommendations = [...(currentRecommendations ?? [])];
  let changed = false;

  for (const recommendation of desiredRecommendations) {
    if (mergedRecommendations.includes(recommendation)) {
      continue;
    }

    mergedRecommendations.push(recommendation);
    changed = true;
  }

  if (existing.exists && !changed) {
    return "unchanged";
  }

  return writeJsoncTopLevelProperty(
    extensionsPath,
    existing,
    "recommendations",
    mergedRecommendations
  );
}

async function writeJsoncTopLevelProperty(
  filePath: string,
  existing: JsoncObjectReadResult,
  propertyKey: string,
  value: unknown
): Promise<ConfigWriteStatus> {
  await mkdir(dirname(filePath), { recursive: true });

  if (!existing.exists) {
    await writeFile(filePath, JSON.stringify({ [propertyKey]: value }, null, 2).concat("\n"), "utf8");
    return "created";
  }

  const edits = modify(existing.source, [propertyKey], value, {
    formattingOptions: JSONC_FORMATTING
  });
  const nextSource = ensureTrailingNewline(applyEdits(existing.source, edits));

  if (nextSource === existing.source) {
    return "unchanged";
  }

  await writeFile(filePath, nextSource, "utf8");
  return "updated";
}

function findConflictingSchemaPath(
  schemaMappings: Record<string, unknown>,
  targetSchemaPath: string,
  desiredGlob: string,
  workspaceTargetPaths: readonly string[]
): string | undefined {
  for (const [existingSchemaPath, existingValue] of Object.entries(schemaMappings)) {
    if (existingSchemaPath === targetSchemaPath) {
      continue;
    }

    const existingGlobs = normalizeSchemaGlobs(existingValue);

    if (!existingGlobs) {
      continue;
    }

    if (existingGlobs.includes(desiredGlob)) {
      return existingSchemaPath;
    }

    if (
      workspaceTargetPaths.some((workspaceTargetPath) =>
        existingGlobs.some((existingGlob) => matchesGlob(existingGlob, workspaceTargetPath))
      )
    ) {
      return existingSchemaPath;
    }
  }

  return undefined;
}

function normalizeSchemaGlobs(value: unknown): string[] | undefined {
  if (typeof value === "string") {
    return [value];
  }

  return normalizeStringArray(value);
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return undefined;
  }

  return [...value];
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function toWorkspaceRelativePath(rootPath: string, targetPath: string): string {
  const relativePath = relative(rootPath, targetPath).replace(/\\/g, "/");

  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    relativePath.startsWith("/")
  ) {
    return relativePath;
  }

  return `./${relativePath}`;
}

function ensureTrailingNewline(source: string): string {
  return source.endsWith("\n") ? source : `${source}\n`;
}

type JsoncObjectReadResult =
  | {
      exists: false;
      source: "";
      status: "ok";
      value: Record<string, unknown>;
    }
  | {
      exists: true;
      source: string;
      status: "ok";
      value: Record<string, unknown>;
    }
  | {
      exists: boolean;
      source: string;
      status: "invalid";
    };

async function readJsoncObject(
  filePath: string,
  warnings: string[]
): Promise<JsoncObjectReadResult> {
  try {
    const source = await readFile(filePath, "utf8");
    const errors: ParseError[] = [];
    const parsed = parse(source, errors, {
      allowTrailingComma: true,
      disallowComments: false
    });

    if (errors.length > 0) {
      warnings.push(formatJsoncErrors(filePath, errors));
      return {
        exists: true,
        source,
        status: "invalid"
      };
    }

    if (!isRecord(parsed)) {
      warnings.push(`Skipped ${filePath} because it must contain a top-level JSON object.`);
      return {
        exists: true,
        source,
        status: "invalid"
      };
    }

    return {
      exists: true,
      source,
      status: "ok",
      value: parsed
    };
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return {
        exists: false,
        source: "",
        status: "ok",
        value: {}
      };
    }

    throw error;
  }
}

function formatJsoncErrors(filePath: string, errors: readonly ParseError[]): string {
  const summary = errors
    .map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
    .join(", ");

  return `Skipped ${filePath} because it is not valid JSONC (${summary}).`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

type DesiredSchemaMapping = {
  schemaPath: string;
  globs: string[];
  workspaceTargetPaths: string[];
};

async function ensureWorkspaceSchemaAssets(schemaDirPath: string): Promise<ConfigWriteStatus> {
  await mkdir(schemaDirPath, { recursive: true });

  const statuses = await Promise.all(
    SCHEMA_FILE_NAMES.map((schemaFileName) =>
      syncSchemaAsset({
        sourcePath: resolve(SCHEMA_DIR_PATH, schemaFileName),
        targetPath: resolve(schemaDirPath, schemaFileName)
      })
    )
  );

  return combineStatuses(statuses);
}

async function syncSchemaAsset(options: {
  sourcePath: string;
  targetPath: string;
}): Promise<Exclude<ConfigWriteStatus, "skipped">> {
  const source = await readFile(options.sourcePath, "utf8");

  await mkdir(dirname(options.targetPath), { recursive: true });

  try {
    const existing = await readFile(options.targetPath, "utf8");

    if (existing === source) {
      return "unchanged";
    }

    await writeFile(options.targetPath, source, "utf8");
    return "updated";
  } catch (error: unknown) {
    if (!isMissingFileError(error)) {
      throw error;
    }

    await writeFile(options.targetPath, source, "utf8");
    return "created";
  }
}

function combineStatuses(
  statuses: readonly Exclude<ConfigWriteStatus, "skipped">[]
): Exclude<ConfigWriteStatus, "skipped"> {
  if (statuses.some((status) => status === "updated")) {
    return "updated";
  }

  if (statuses.some((status) => status === "created")) {
    return "created";
  }

  return "unchanged";
}

async function collectWorkspaceCanonicalFilePaths(rootPath: string): Promise<string[]> {
  const absolutePaths = await listFilesRecursively(
    resolve(rootPath, "ddd-spec", "canonical-vnext")
  );

  return absolutePaths.map((absolutePath) => toWorkspaceMatchPath(rootPath, absolutePath));
}

async function listFilesRecursively(rootPath: string): Promise<string[]> {
  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    const nestedPaths = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = resolve(rootPath, entry.name);

        if (entry.isDirectory()) {
          return listFilesRecursively(entryPath);
        }

        if (entry.isFile()) {
          return [entryPath];
        }

        return [];
      })
    );

    return nestedPaths.flat();
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw error;
  }
}

function matchesAnyGlob(globs: readonly string[], filePath: string): boolean {
  return globs.some((glob) => matchesGlob(glob, filePath));
}

function matchesGlob(glob: string, filePath: string): boolean {
  try {
    return picomatch(glob, { dot: true })(filePath);
  } catch {
    return false;
  }
}

function toWorkspaceMatchPath(rootPath: string, targetPath: string): string {
  return relative(rootPath, targetPath).replace(/\\/g, "/");
}
