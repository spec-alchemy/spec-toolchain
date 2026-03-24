import { runCliCommand } from "../../../packages/ddd-spec-cli/index.js";
import { designSpecConfigPath } from "../config.js";

await runCliCommand(["generate", "typescript", "--config", designSpecConfigPath]);
