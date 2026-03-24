import { runCliCommand } from "../../../packages/ddd-spec-cli/index.js";
import { repoRootPath } from "../config.js";

await runCliCommand(["bundle"], { cwd: repoRootPath });
