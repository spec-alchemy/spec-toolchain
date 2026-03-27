import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  isVnextBusinessSpec,
  loadCanonicalSpec,
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics,
  validateVnextCanonicalSchema
} from "../ddd-spec-core/index.js";
import { logArtifact, logInfo } from "./console.js";
import { DEFAULT_SCHEMA_PATH, DEFAULT_VNEXT_SCHEMA_PATH } from "./config.js";
import { ensureVsCodeWorkspaceConfig } from "./editor-config.js";
import {
  DEFAULT_INIT_TEMPLATE_ID,
  getInitScaffoldRelativePaths,
  getInitTemplate,
  getInitTemplateDirectoryPaths,
  type InitTemplateDefinition,
  ZERO_CONFIG_CANONICAL_DIR
} from "./init-templates.js";

const GITIGNORE_ENTRY = ".ddd-spec/";
const EXISTING_GITIGNORE_MATCHES = new Set([GITIGNORE_ENTRY, ".ddd-spec"]);

const LEGACY_SCAFFOLD_RELATIVE_PATHS = [
  `${ZERO_CONFIG_CANONICAL_DIR}/objects/work-item.object.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/commands/create-work-item.command.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/events/work-item-created.event.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/work-item.aggregate.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/processes/work-item-lifecycle.process.yaml`,
  `${ZERO_CONFIG_CANONICAL_DIR}/vocabulary/viewer-detail-semantics.yaml`
] as const;

const SCAFFOLD_RELATIVE_PATHS = [
  ...getInitScaffoldRelativePaths(),
  ...LEGACY_SCAFFOLD_RELATIVE_PATHS
];

export interface InitDddSpecOptions {
  cwd?: string;
  templateId?: string;
}

export async function initDddSpec(
  options: InitDddSpecOptions = {}
): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const template = getInitTemplate(options.templateId ?? DEFAULT_INIT_TEMPLATE_ID);
  const entryPath = resolve(cwd, template.entryPath);

  await assertNoExistingScaffold(cwd, template);
  await createTemplateDirectories(cwd, template);

  let gitignoreStatus: "created" | "updated" | "unchanged";

  try {
    for (const file of template.files) {
      await writeFile(resolve(cwd, file.relativePath), file.source, "utf8");
    }

    await validateGeneratedSkeleton(entryPath);
    gitignoreStatus = await ensureGitignoreEntry(cwd);
  } catch (error) {
    await cleanupScaffoldFiles(cwd, template);
    throw error;
  }

  logArtifact("created canonical entry", entryPath);
  logInfo(`created ${template.label} under ${resolve(cwd, template.scaffoldDir)}`);

  if (gitignoreStatus === "created") {
    logArtifact("created .gitignore", resolve(cwd, ".gitignore"));
  } else if (gitignoreStatus === "updated") {
    logInfo("updated .gitignore to ignore .ddd-spec/");
  } else {
    logInfo(".gitignore already ignores .ddd-spec/");
  }

  await configureVsCodeWorkspace(cwd);

  logInfo(
    `next: edit ${template.scaffoldDir}/ and run \`ddd-spec dev\` for the live rebuild loop plus packaged viewer`
  );
  logInfo(
    "alternative: run `ddd-spec validate`, then `ddd-spec build`, then `ddd-spec viewer` when you want one-shot steps"
  );
}

async function assertNoExistingScaffold(
  cwd: string,
  template: InitTemplateDefinition
): Promise<void> {
  const existingFile = await findExistingScaffoldFile(cwd);
  const entryPath = resolve(cwd, template.entryPath);

  if (!existingFile) {
    return;
  }

  if (existingFile === entryPath) {
    throw new Error(
      `Refusing to overwrite existing canonical entry at ${existingFile}. Keep editing that workspace in place, or remove the existing scaffold before running \`ddd-spec init\` again.`
    );
  }

  throw new Error(
    `Refusing to overwrite existing scaffold file at ${existingFile}. Remove the existing scaffold or switch to an empty consumer workspace before running \`ddd-spec init\` again.`
  );
}

async function findExistingScaffoldFile(cwd: string): Promise<string | undefined> {
  for (const relativePath of SCAFFOLD_RELATIVE_PATHS) {
    const absolutePath = resolve(cwd, relativePath);

    if (await pathExists(absolutePath)) {
      return absolutePath;
    }
  }

  return undefined;
}

async function createTemplateDirectories(
  cwd: string,
  template: InitTemplateDefinition
): Promise<void> {
  for (const directory of getInitTemplateDirectoryPaths(template)) {
    await mkdir(resolve(cwd, directory), {
      recursive: true
    });
  }
}

async function validateGeneratedSkeleton(entryPath: string): Promise<void> {
  const spec = await loadCanonicalSpec({
    entryPath,
    validateSemantics: false
  });

  if (isVnextBusinessSpec(spec)) {
    await validateVnextCanonicalSchema({
      entryPath,
      schemaPath: DEFAULT_VNEXT_SCHEMA_PATH
    });
  } else {
    await validateBusinessSpecSchema(spec, {
      schemaPath: DEFAULT_SCHEMA_PATH
    });
  }
  validateBusinessSpecSemantics(spec);
}

async function ensureGitignoreEntry(
  cwd: string
): Promise<"created" | "updated" | "unchanged"> {
  const gitignorePath = resolve(cwd, ".gitignore");
  const exists = await pathExists(gitignorePath);

  if (!exists) {
    await writeFile(gitignorePath, `${GITIGNORE_ENTRY}\n`, "utf8");
    return "created";
  }

  const currentSource = await readFile(gitignorePath, "utf8");
  const lines = currentSource.split(/\r?\n/);

  if (lines.some((line) => EXISTING_GITIGNORE_MATCHES.has(line.trim()))) {
    return "unchanged";
  }

  if (currentSource.length === 0) {
    await writeFile(gitignorePath, `${GITIGNORE_ENTRY}\n`, "utf8");
    return "updated";
  }

  const nextSource = currentSource.endsWith("\n")
    ? `${currentSource}${GITIGNORE_ENTRY}\n`
    : `${currentSource}\n${GITIGNORE_ENTRY}\n`;

  await writeFile(gitignorePath, nextSource, "utf8");
  return "updated";
}

async function cleanupScaffoldFiles(
  cwd: string,
  template: InitTemplateDefinition
): Promise<void> {
  for (const file of template.files) {
    await rm(resolve(cwd, file.relativePath), {
      force: true
    });
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function configureVsCodeWorkspace(cwd: string): Promise<void> {
  try {
    const result = await ensureVsCodeWorkspaceConfig(cwd);

    if (result.schemaAssetsStatus === "created") {
      logArtifact("created VS Code YAML schema assets", result.schemaDirPath);
    } else if (result.schemaAssetsStatus === "updated") {
      logInfo("updated .vscode/ddd-spec/schema with YAML schema assets");
    } else if (result.schemaAssetsStatus === "unchanged") {
      logInfo(".vscode/ddd-spec/schema already includes YAML schema assets");
    }

    if (result.settingsStatus === "created") {
      logArtifact("created VS Code YAML schema settings", result.settingsPath);
    } else if (result.settingsStatus === "updated") {
      logInfo("updated .vscode/settings.json with YAML schema mappings");
    } else if (result.settingsStatus === "unchanged") {
      logInfo(".vscode/settings.json already includes YAML schema mappings");
    }

    if (result.extensionsStatus === "created") {
      logArtifact("created VS Code extension recommendations", result.extensionsPath);
    } else if (result.extensionsStatus === "updated") {
      logInfo("updated .vscode/extensions.json with recommended YAML tooling");
    } else if (result.extensionsStatus === "unchanged") {
      logInfo(".vscode/extensions.json already recommends YAML tooling");
    }

    for (const warning of result.warnings) {
      logInfo(`warning: ${warning}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logInfo(`warning: could not configure VS Code YAML support automatically: ${message}`);
  }
}
