import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirPath = dirname(fileURLToPath(import.meta.url));
const packageScriptsDirPath = dirname(scriptDirPath);
const packageDirPath = dirname(packageScriptsDirPath);
const distDirPath = join(packageDirPath, "dist");
const schemaSourceDirPath = join(
  packageDirPath,
  "..",
  "ddd-spec-core",
  "schema"
);
const schemaOutputDirPath = join(
  distDirPath,
  "ddd-spec-core",
  "schema"
);
const cliEntryPath = join(distDirPath, "ddd-spec-cli", "cli.js");
const viewerAppDirPath = join(packageDirPath, "..", "..", "apps", "ddd-spec-viewer");
const viewerStaticOutputPath = join(
  distDirPath,
  "ddd-spec-cli",
  "static",
  "viewer"
);
const viewerGeneratedGitkeepPath = join(
  viewerStaticOutputPath,
  "generated",
  ".gitkeep"
);

export function createBuildContext() {
  return {
    cliEntryPath,
    distDirPath,
    packageDirPath,
    schemaOutputDirPath,
    schemaSourceDirPath,
    viewerAppDirPath,
    viewerGeneratedGitkeepPath,
    viewerStaticOutputPath
  };
}
