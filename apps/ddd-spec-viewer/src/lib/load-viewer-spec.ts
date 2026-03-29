import {
  BUSINESS_VIEWER_SPEC_VERSION,
  DEFAULT_VIEWER_LOCALE,
  type ViewerLocale
} from "@spec-alchemy/spec-viewer-contract";
import type { BusinessViewerSpec } from "../types";
import { DEFAULT_VIEWER_SPEC_PATH } from "./viewer-constants";
import {
  resolveViewerLocale,
  toViewerLocaleSpecUrl
} from "./viewer-locale";
import { formatViewerLocaleFallbackNotice } from "./viewer-system-copy";
const SPEC_QUERY_PARAM = "spec";

export interface ViewerSpecSource {
  url: URL;
  label: string;
  isDefault: boolean;
}

export interface ViewerSpecLoadFallback {
  requestedLabel: string;
  requestedUrl: URL;
  fallbackLabel: string;
  fallbackUrl: URL;
  notice: string | null;
}

export interface ViewerSpecLoadResult {
  spec: BusinessViewerSpec;
  locale: ViewerLocale;
  source: ViewerSpecSource;
  loadedLabel: string;
  loadedUrl: URL;
  fallback: ViewerSpecLoadFallback | null;
}

export function resolveViewerSpecSource(
  locationUrl: URL = new URL(window.location.href)
): ViewerSpecSource {
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
  options: {
    fetchImpl?: typeof fetch;
    locale?: ViewerLocale;
    locationUrl?: URL;
    source?: ViewerSpecSource;
  } = {}
): Promise<ViewerSpecLoadResult> {
  const locationUrl = options.locationUrl ?? safeLocationUrl();
  const source =
    options.source ??
    resolveViewerSpecSource(locationUrl ?? new URL(DEFAULT_VIEWER_SPEC_PATH, "https://ddd-spec-viewer.local/"));
  const locale =
    options.locale ??
    (locationUrl ? resolveViewerLocale(locationUrl).locale : DEFAULT_VIEWER_LOCALE);
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestedUrl = toViewerLocaleSpecUrl(source.url, locale);
  const requestedLabel = formatViewerSpecLabel(requestedUrl, locationUrl);

  if (requestedUrl.href === source.url.href) {
    return {
      spec: await loadViewerSpecDocument(requestedUrl, fetchImpl),
      locale,
      source,
      loadedLabel: requestedLabel,
      loadedUrl: requestedUrl,
      fallback: null
    };
  }

  try {
    return {
      spec: await loadViewerSpecDocument(requestedUrl, fetchImpl),
      locale,
      source,
      loadedLabel: requestedLabel,
      loadedUrl: requestedUrl,
      fallback: null
    };
  } catch (localizedError: unknown) {
    try {
      return {
        spec: await loadViewerSpecDocument(source.url, fetchImpl),
        locale,
        source,
        loadedLabel: source.label,
        loadedUrl: source.url,
        fallback: {
          requestedLabel,
          requestedUrl,
          fallbackLabel: source.label,
          fallbackUrl: source.url,
          notice: source.isDefault
            ? null
            : formatViewerLocaleFallbackNotice({
                locale,
                requestedLabel,
                fallbackLabel: source.label
              })
        }
      };
    } catch (fallbackError: unknown) {
      throw new Error(
        `Failed to load localized viewer artifact ${requestedUrl.href} (${toErrorMessage(localizedError)}), and fallback ${source.url.href} also failed (${toErrorMessage(fallbackError)}).`
      );
    }
  }
}

async function loadViewerSpecDocument(
  specUrl: URL,
  fetchImpl: typeof fetch
): Promise<BusinessViewerSpec> {
  const response = await fetchImpl(specUrl, {
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

function formatViewerSpecLabel(
  specUrl: URL,
  locationUrl: URL | null
): string {
  if (locationUrl && specUrl.origin === locationUrl.origin) {
    return `${specUrl.pathname.replace(/^\/+/, "")}${specUrl.search}${specUrl.hash}`;
  }

  return specUrl.href;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function safeLocationUrl(): URL | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URL(window.location.href);
}
