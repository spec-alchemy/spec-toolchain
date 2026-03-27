import { BUSINESS_VIEWER_SPEC_VERSION } from "@knowledge-alchemy/ddd-spec-viewer-contract";
import type { BusinessViewerSpec } from "../types";
import { DEFAULT_VIEWER_SPEC_PATH } from "./viewer-constants";
const SPEC_QUERY_PARAM = "spec";

export interface ViewerSpecSource {
  url: URL;
  label: string;
  isDefault: boolean;
}

export function resolveViewerSpecSource(): ViewerSpecSource {
  const locationUrl = new URL(window.location.href);
  const rawSpecSource = locationUrl.searchParams.get(SPEC_QUERY_PARAM)?.trim();

  if (!rawSpecSource) {
    const baseUrl = new URL(import.meta.env.BASE_URL, locationUrl);

    return {
      url: new URL(DEFAULT_VIEWER_SPEC_PATH, baseUrl),
      label: DEFAULT_VIEWER_SPEC_PATH,
      isDefault: true
    };
  }

  return {
    url: new URL(rawSpecSource, locationUrl.href),
    label: rawSpecSource,
    isDefault: false
  };
}

export async function loadViewerSpec(
  source: ViewerSpecSource = resolveViewerSpecSource()
): Promise<BusinessViewerSpec> {
  const specUrl = source.url;

  const response = await fetch(specUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load ${specUrl.href} (${response.status} ${response.statusText})`
    );
  }

  const spec = (await response.json()) as BusinessViewerSpec;

  if (spec.viewerVersion !== BUSINESS_VIEWER_SPEC_VERSION) {
    throw new Error(
      `Unsupported viewer spec version ${String(spec.viewerVersion)}; expected ${String(BUSINESS_VIEWER_SPEC_VERSION)}`
    );
  }

  return spec;
}
