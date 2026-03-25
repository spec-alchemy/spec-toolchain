import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirPath = dirname(fileURLToPath(import.meta.url));
const packageDirPath = resolve(scriptDirPath, "..");
const repoRootPath = resolve(packageDirPath, "..", "..");
const cliEntryPath = resolve(packageDirPath, "dist", "ddd-spec-cli", "cli.js");

process.chdir(repoRootPath);
await import(pathToFileURL(cliEntryPath).href);
