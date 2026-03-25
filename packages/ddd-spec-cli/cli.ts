#!/usr/bin/env node

import { formatCliFailureOutput } from "./console.js";
import { runCliCommand } from "./commands.js";

const argv = process.argv.slice(2);

try {
  await runCliCommand(argv);
} catch (error: unknown) {
  console.error(formatCliFailureOutput(argv, error));
  process.exitCode = 1;
}
