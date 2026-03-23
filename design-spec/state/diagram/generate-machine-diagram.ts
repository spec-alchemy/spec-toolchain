import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cardMachine } from "../machines/card.machine.js";
import { connectionMachine } from "../machines/connection.machine.js";
import { connectionCardReviewSystem } from "../system/connection-card-review.system.js";
import { machineToMermaid } from "./machine-to-mermaid.js";

const diagramTargets = [
  {
    sourcePath: "design-spec/state/machines/card.machine.ts",
    outputUrl: new URL("../diagrams/card.machine.mmd", import.meta.url),
    machine: cardMachine.logic
  },
  {
    sourcePath: "design-spec/state/machines/connection.machine.ts",
    outputUrl: new URL("../diagrams/connection.machine.mmd", import.meta.url),
    machine: connectionMachine.logic
  },
  {
    sourcePath: "design-spec/state/system/connection-card-review.system.ts",
    outputUrl: new URL("../diagrams/connection-card-review.system.mmd", import.meta.url),
    machine: connectionCardReviewSystem.logic
  }
] as const;

for (const target of diagramTargets) {
  const outputPath = fileURLToPath(target.outputUrl);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    machineToMermaid(target.machine, {
      sourcePath: target.sourcePath
    }),
    "utf8"
  );

  console.log(`Generated ${target.sourcePath} -> ${outputPath}`);
}
