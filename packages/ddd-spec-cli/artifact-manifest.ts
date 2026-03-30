import { relative } from "node:path";
import type { BusinessSpecAnalysis } from "../ddd-spec-core/index.js";
import {
  SHARED_ARTIFACT_MANIFEST_VERSION,
  type SharedArtifactManifest,
  type SharedArtifactManifestEntry
} from "../spec-toolchain-shared-kernel/artifact-manifest.js";
import type { ViewerLocale } from "../ddd-spec-viewer-contract/index.js";
import { VIEWER_LOCALES } from "../ddd-spec-viewer-contract/index.js";
import type { ResolvedDddSpecConfig } from "./config.js";
import { toViewerLocaleArtifactPath } from "./viewer-artifacts.js";

export const SHARED_ARTIFACT_MANIFEST_FILE_NAME = "artifact-manifest.json";
const DDD_SPEC_FAMILY = "ddd-spec";

interface BuildSharedArtifactManifestOptions {
  analysis?: BusinessSpecAnalysis;
  includeBundle?: boolean;
  includeAnalysis?: boolean;
  includeViewer?: boolean;
}

export function resolveArtifactManifestPath(
  config: Pick<ResolvedDddSpecConfig, "outputs">
): string | undefined {
  return config.outputs.rootDirPath
    ? `${config.outputs.rootDirPath}/${SHARED_ARTIFACT_MANIFEST_FILE_NAME}`
    : undefined;
}

export function buildSharedArtifactManifest(
  config: Pick<ResolvedDddSpecConfig, "outputs">,
  options: BuildSharedArtifactManifestOptions = {}
): SharedArtifactManifest {
  const rootDirPath = config.outputs.rootDirPath;

  if (!rootDirPath) {
    throw new Error("artifact manifest requires outputs.rootDirPath");
  }

  const artifacts: SharedArtifactManifestEntry[] = [];
  const canonicalSourceIds = options.analysis
    ? collectCanonicalSourceIds(options.analysis)
    : undefined;

  if (options.includeBundle && config.outputs.bundlePath) {
    artifacts.push({
      id: "business-spec.bundle",
      family: DDD_SPEC_FAMILY,
      kind: "domain-model-bundle",
      role: "generation",
      locator: {
        relativePath: toManifestRelativePath(rootDirPath, config.outputs.bundlePath),
        mediaType: "application/json"
      },
      sourceIds: canonicalSourceIds
    });
  }

  if (options.includeAnalysis && config.outputs.analysisPath) {
    artifacts.push({
      id: "business-spec.analysis",
      family: DDD_SPEC_FAMILY,
      kind: "analysis-ir",
      role: "analysis",
      locator: {
        relativePath: toManifestRelativePath(rootDirPath, config.outputs.analysisPath),
        mediaType: "application/json"
      },
      sourceIds: canonicalSourceIds
    });
  }

  if (options.includeViewer && config.outputs.viewerPath) {
    artifacts.push(
      toDefaultViewerArtifactEntry(rootDirPath, config.outputs.viewerPath)
    );

    for (const locale of VIEWER_LOCALES) {
      artifacts.push(
        toViewerArtifactEntry(rootDirPath, config.outputs.viewerPath, locale)
      );
    }
  }

  return {
    manifestVersion: SHARED_ARTIFACT_MANIFEST_VERSION,
    artifacts
  };
}

function toDefaultViewerArtifactEntry(
  rootDirPath: string,
  viewerPath: string
): SharedArtifactManifestEntry {
  return {
    id: "viewer-spec",
    family: DDD_SPEC_FAMILY,
    kind: "viewer-spec",
    role: "viewer",
    locator: {
      relativePath: toManifestRelativePath(rootDirPath, viewerPath),
      mediaType: "application/json"
    }
  };
}

function toViewerArtifactEntry(
  rootDirPath: string,
  viewerPath: string,
  locale: ViewerLocale
): SharedArtifactManifestEntry {
  const localizedPath = toViewerLocaleArtifactPath(viewerPath, locale);

  return {
    id: `viewer-spec.${locale}`,
    family: DDD_SPEC_FAMILY,
    kind: "viewer-spec",
    role: "viewer",
    locator: {
      relativePath: toManifestRelativePath(rootDirPath, localizedPath),
      mediaType: "application/json"
    }
  };
}

function collectCanonicalSourceIds(
  analysis: BusinessSpecAnalysis
): readonly string[] {
  const sourceIds = new Set<string>();

  for (const context of analysis.ir.contextBoundaries) {
    sourceIds.add(context.stableId.value);
  }

  for (const actor of analysis.ir.actors) {
    sourceIds.add(actor.stableId.value);
  }

  for (const system of analysis.ir.systems) {
    sourceIds.add(system.stableId.value);
  }

  for (const scenario of analysis.ir.scenarioSequences) {
    sourceIds.add(scenario.stableId.value);
  }

  for (const message of analysis.ir.messageFlows) {
    sourceIds.add(message.stableId.value);

    for (const link of message.provenance.upstream) {
      sourceIds.add(link.source.target.value);
    }
  }

  for (const aggregate of analysis.ir.aggregateLifecycles) {
    sourceIds.add(aggregate.stableId.value);
  }

  for (const policy of analysis.ir.policyCoordinations) {
    sourceIds.add(policy.stableId.value);
  }

  return [...sourceIds];
}

function toManifestRelativePath(rootDirPath: string, outputPath: string): string {
  return relative(rootDirPath, outputPath).replaceAll("\\", "/");
}
