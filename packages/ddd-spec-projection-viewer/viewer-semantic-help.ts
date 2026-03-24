import type {
  BusinessSpec,
  ViewerDetailSemanticSpec
} from "../ddd-spec-core/spec.js";

export function buildSemanticDetailHelp(
  spec: BusinessSpec
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(spec.vocabulary.viewerDetails).map(([semanticKey, semantic]) => [
      semanticKey,
      semantic.description
    ])
  );
}

export function getViewerDetailSemantic(
  spec: BusinessSpec,
  semanticKey: string
): ViewerDetailSemanticSpec {
  const semantic = spec.vocabulary.viewerDetails[semanticKey];

  if (!semantic) {
    throw new Error(`Unknown viewer detail semantic ${semanticKey}`);
  }

  return semantic;
}
