import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  loadBusinessSpec,
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics
} from "../ddd-spec-core/index.js";
import { logArtifact, logInfo } from "./console.js";
import { DEFAULT_SCHEMA_PATH, ZERO_CONFIG_ENTRY_PATH } from "./config.js";

const ZERO_CONFIG_CANONICAL_DIR = "ddd-spec/canonical";
const GITIGNORE_ENTRY = ".ddd-spec/";
const EXISTING_GITIGNORE_MATCHES = new Set([GITIGNORE_ENTRY, ".ddd-spec"]);

const MINIMAL_SCAFFOLD_FILES = [
  {
    relativePath: ZERO_CONFIG_ENTRY_PATH,
    source: `version: 1
id: starter-domain
title: Starter Domain
summary: Minimal starter domain created by ddd-spec init.
vocabulary:
  viewerDetails: ./vocabulary/viewer-detail-semantics.yaml
domain:
  objects:
    - ./objects/work-item.object.yaml
  commands:
    - ./commands/create-work-item.command.yaml
  events:
    - ./events/work-item-created.event.yaml
  aggregates:
    - ./aggregates/work-item.aggregate.yaml
  processes:
    - ./processes/work-item-lifecycle.process.yaml
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/vocabulary/viewer-detail-semantics.yaml`,
    source: `identity:
  label: Identity
  description: Primary identifier shown in viewer detail panels.
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/objects/work-item.object.yaml`,
    source: `kind: object
id: WorkItem
title: Work Item
lifecycleField: status
lifecycle:
  - draft
  - active
fields:
  - id: workItemId
    type: string
    required: true
  - id: status
    type: string
    required: true
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/commands/create-work-item.command.yaml`,
    source: `kind: command
type: CreateWorkItem
target: WorkItem
description: Create the initial work item record.
payload:
  fields:
    - id: workItemId
      type: string
      required: true
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/events/work-item-created.event.yaml`,
    source: `kind: event
type: WorkItemCreated
source: WorkItem
description: Record that the work item was created.
payload:
  fields:
    - id: workItemId
      type: string
      required: true
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/aggregates/work-item.aggregate.yaml`,
    source: `kind: aggregate
objectId: WorkItem
initial: draft
states:
  draft:
    on:
      CreateWorkItem:
        target: active
        emit:
          type: WorkItemCreated
          payloadFrom:
            workItemId: $command.workItemId
  active: {}
`
  },
  {
    relativePath: `${ZERO_CONFIG_CANONICAL_DIR}/processes/work-item-lifecycle.process.yaml`,
    source: `kind: process
id: workItemLifecycle
title: Work Item Lifecycle
uses:
  aggregates:
    workItem: WorkItem
initialStage: drafting
stages:
  drafting:
    title: Drafting
    aggregate: workItem
    state: draft
    advancesOn:
      WorkItemCreated: active
  active:
    title: Active
    final: true
    outcome: Work item created
`
  }
] as const;

const CANONICAL_SUBDIRECTORIES = [
  "objects",
  "commands",
  "events",
  "aggregates",
  "processes",
  "vocabulary"
] as const;

export interface InitDddSpecOptions {
  cwd?: string;
}

export async function initDddSpec(
  options: InitDddSpecOptions = {}
): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const entryPath = resolve(cwd, ZERO_CONFIG_ENTRY_PATH);

  await assertNoExistingScaffold(cwd);
  await createCanonicalDirectories(cwd);

  let gitignoreStatus: "created" | "updated" | "unchanged";

  try {
    for (const file of MINIMAL_SCAFFOLD_FILES) {
      await writeFile(resolve(cwd, file.relativePath), file.source, "utf8");
    }

    await validateGeneratedSkeleton(entryPath);
    gitignoreStatus = await ensureGitignoreEntry(cwd);
  } catch (error) {
    await cleanupScaffoldFiles(cwd);
    throw error;
  }

  logArtifact("created canonical entry", entryPath);
  logInfo(`created starter files under ${resolve(cwd, ZERO_CONFIG_CANONICAL_DIR)}`);

  if (gitignoreStatus === "created") {
    logArtifact("created .gitignore", resolve(cwd, ".gitignore"));
    return;
  }

  if (gitignoreStatus === "updated") {
    logInfo("updated .gitignore to ignore .ddd-spec/");
    return;
  }

  logInfo(".gitignore already ignores .ddd-spec/");
}

async function assertNoExistingScaffold(cwd: string): Promise<void> {
  const existingFile = await findExistingScaffoldFile(cwd);
  const entryPath = resolve(cwd, ZERO_CONFIG_ENTRY_PATH);

  if (!existingFile) {
    return;
  }

  if (existingFile === entryPath) {
    throw new Error(
      `Refusing to overwrite existing canonical entry at ${existingFile}.`
    );
  }

  throw new Error(
    `Refusing to overwrite existing scaffold file at ${existingFile}. Remove it before running \`ddd-spec init\` again.`
  );
}

async function findExistingScaffoldFile(cwd: string): Promise<string | undefined> {
  for (const file of MINIMAL_SCAFFOLD_FILES) {
    const absolutePath = resolve(cwd, file.relativePath);

    if (await pathExists(absolutePath)) {
      return absolutePath;
    }
  }

  return undefined;
}

async function createCanonicalDirectories(cwd: string): Promise<void> {
  await mkdir(resolve(cwd, ZERO_CONFIG_CANONICAL_DIR), { recursive: true });

  for (const directory of CANONICAL_SUBDIRECTORIES) {
    await mkdir(resolve(cwd, ZERO_CONFIG_CANONICAL_DIR, directory), {
      recursive: true
    });
  }
}

async function validateGeneratedSkeleton(entryPath: string): Promise<void> {
  const spec = await loadBusinessSpec({
    entryPath,
    validateSemantics: false
  });

  await validateBusinessSpecSchema(spec, {
    schemaPath: DEFAULT_SCHEMA_PATH
  });
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

async function cleanupScaffoldFiles(cwd: string): Promise<void> {
  for (const file of MINIMAL_SCAFFOLD_FILES) {
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
