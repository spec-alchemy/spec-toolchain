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

  if (semantic) {
    return semantic;
  }

  return {
    label: humanizeSemanticKey(semanticKey),
    description: `Structured detail for ${semanticKey}.`
  };
}

function humanizeSemanticKey(semanticKey: string): string {
  return semanticKey
    .split(".")
    .map((segment) =>
      segment
        .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, "$1 $2")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}
