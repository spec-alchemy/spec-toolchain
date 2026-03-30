import { createBuildContext } from "./build-pipeline/context.mjs";
import {
  buildCliTypescript,
  cleanDistOutput,
  copyRuntimeSchemaAssets,
  finalizeBuildOutput,
  prepareViewerStaticAssets
} from "./build-pipeline/steps.mjs";

const buildContext = createBuildContext();

await runBuildStep("clean dist output", () => cleanDistOutput(buildContext));
await runBuildStep("CLI TypeScript build", () => buildCliTypescript(buildContext));
await runBuildStep("viewer static preparation", () =>
  prepareViewerStaticAssets(buildContext)
);
await runBuildStep("runtime schema copy", () => copyRuntimeSchemaAssets(buildContext));
await runBuildStep("post-build output adjustments", () =>
  finalizeBuildOutput(buildContext)
);

async function runBuildStep(label, action) {
  try {
    await action();
  } catch (error) {
    const causeMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(`[ddd-spec-cli build] ${label} failed: ${causeMessage}`);
  }
}
