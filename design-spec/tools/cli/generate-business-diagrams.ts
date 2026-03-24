import { rm } from "node:fs/promises";
import { resolveDesignSpecPath, writeTextArtifact } from "../artifact-io.js";
import { buildBusinessGraph } from "../graph-analysis.js";
import { loadBusinessSpec } from "../spec.js";
import {
  aggregateGraphToMermaid,
  processCompositionGraphToMermaid,
  processGraphToMermaid
} from "../diagram/business-graph-to-mermaid.js";

const spec = await loadBusinessSpec();
const graph = buildBusinessGraph(spec);

await rm(resolveDesignSpecPath("artifacts/business-diagrams"), {
  force: true,
  recursive: true
});
await rm(resolveDesignSpecPath("artifacts/state-diagrams"), {
  force: true,
  recursive: true
});

const aggregateTargets = graph.aggregates.map((aggregate) => ({
  sourcePath: `design-spec/canonical/aggregates/${aggregate.objectId.toLowerCase()}.aggregate.yaml`,
  outputPath: `artifacts/business-diagrams/${aggregate.objectId.toLowerCase()}.aggregate.mmd`,
  sourceLabel: `${aggregate.objectId} aggregate`,
  sourceText: aggregateGraphToMermaid(aggregate, {
    sourcePath: `design-spec/canonical/aggregates/${aggregate.objectId.toLowerCase()}.aggregate.yaml`
  })
}));

const processTargets = graph.processes.flatMap((process) => {
  const sourcePath = `design-spec/canonical/processes/${toProcessFileBaseName(process.processId)}.yaml`;
  const outputBaseName = toProcessFileBaseName(process.processId);

  return [
    {
      sourcePath,
      outputPath: `artifacts/business-diagrams/${outputBaseName}.mmd`,
      sourceLabel: `${process.processId} process`,
      sourceText: processGraphToMermaid(process, {
        sourcePath
      })
    },
    {
      sourcePath,
      outputPath: `artifacts/business-diagrams/${outputBaseName}.composition.mmd`,
      sourceLabel: `${process.processId} process composition`,
      sourceText: processCompositionGraphToMermaid(process, {
        sourcePath
      })
    }
  ];
});

for (const target of [...aggregateTargets, ...processTargets]) {
  const outputPath = await writeTextArtifact(target.outputPath, target.sourceText);

  console.log(`Generated ${target.sourceLabel} -> ${outputPath}`);
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function toProcessFileBaseName(processId: string): string {
  const suffix = "Process";
  const baseName = processId.endsWith(suffix) ? processId.slice(0, -suffix.length) : processId;

  return `${toKebabCase(baseName)}.process`;
}
