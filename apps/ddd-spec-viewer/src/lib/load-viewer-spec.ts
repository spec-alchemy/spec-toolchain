import type { BusinessViewerSpec } from "../types";

const DEFAULT_VIEWER_SPEC_PATH = "generated/viewer-spec.json";
const SPEC_QUERY_PARAM = "spec";
const ENV_DEFAULT_SPEC_URL = import.meta.env.VITE_DDD_SPEC_DEFAULT_URL?.trim();
const ENV_DEFAULT_SPEC_LABEL = import.meta.env.VITE_DDD_SPEC_DEFAULT_LABEL?.trim();

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
    const defaultSpecUrl = ENV_DEFAULT_SPEC_URL
      ? new URL(ENV_DEFAULT_SPEC_URL, locationUrl.origin)
      : new URL(DEFAULT_VIEWER_SPEC_PATH, baseUrl);

    return {
      url: defaultSpecUrl,
      label: ENV_DEFAULT_SPEC_LABEL || DEFAULT_VIEWER_SPEC_PATH,
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

  return response.json() as Promise<BusinessViewerSpec>;
}
