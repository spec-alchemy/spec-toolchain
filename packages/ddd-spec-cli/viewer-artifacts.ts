import { extname } from "node:path";
import {
  VIEWER_LOCALES,
  type ViewerLocale
} from "../ddd-spec-viewer-contract/index.js";

export function toViewerLocaleArtifactPath(
  artifactPath: string,
  locale: ViewerLocale
): string {
  const extension = extname(artifactPath);
  const stem = extension.length > 0
    ? artifactPath.slice(0, -extension.length)
    : artifactPath;

  return `${stem}.${locale}${extension}`;
}

export function expandViewerArtifactPaths(
  artifactPath: string
): readonly string[] {
  return [
    artifactPath,
    ...VIEWER_LOCALES.map((locale) => toViewerLocaleArtifactPath(artifactPath, locale))
  ];
}
