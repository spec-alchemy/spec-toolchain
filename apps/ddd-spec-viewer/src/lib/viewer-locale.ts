import {
  DEFAULT_VIEWER_LOCALE,
  VIEWER_LOCALES,
  type ViewerLocale
} from "@spec-alchemy/spec-viewer-contract";

export const VIEWER_LOCALE_QUERY_PARAM = "lang";
export const VIEWER_LOCALE_STORAGE_KEY = "ddd-spec-viewer.locale";

export interface ViewerLocaleResolution {
  locale: ViewerLocale;
  source: "url" | "storage" | "default";
}

interface ViewerLocaleStorageReader {
  getItem(key: string): string | null;
}

interface ViewerLocaleStorageWriter {
  setItem(key: string, value: string): void;
}

interface ViewerHistoryLike {
  readonly state?: unknown;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

export function isViewerLocale(value: string | null | undefined): value is ViewerLocale {
  return typeof value === "string" && VIEWER_LOCALES.includes(value as ViewerLocale);
}

export function resolveViewerLocale(
  locationUrl: URL = new URL(window.location.href),
  storage: ViewerLocaleStorageReader | null = safeLocalStorageReader()
): ViewerLocaleResolution {
  const urlLocale = locationUrl.searchParams.get(VIEWER_LOCALE_QUERY_PARAM)?.trim();

  if (isViewerLocale(urlLocale)) {
    return {
      locale: urlLocale,
      source: "url"
    };
  }

  const storedLocale = storage?.getItem(VIEWER_LOCALE_STORAGE_KEY)?.trim();

  if (isViewerLocale(storedLocale)) {
    return {
      locale: storedLocale,
      source: "storage"
    };
  }

  return {
    locale: DEFAULT_VIEWER_LOCALE,
    source: "default"
  };
}

export function writeViewerLocalePreference(
  locale: ViewerLocale,
  storage: ViewerLocaleStorageWriter | null = safeLocalStorageWriter()
): void {
  try {
    storage?.setItem(VIEWER_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage write failures so locale switching still works in private or locked-down contexts.
  }
}

export function syncViewerLocaleUrl(
  locale: ViewerLocale,
  options: {
    history?: ViewerHistoryLike | null;
    locationUrl?: URL;
  } = {}
): URL {
  const locationUrl = options.locationUrl ?? new URL(window.location.href);
  const nextUrl = new URL(locationUrl.href);

  nextUrl.searchParams.set(VIEWER_LOCALE_QUERY_PARAM, locale);

  if (
    options.history &&
    nextUrl.href !== locationUrl.href
  ) {
    options.history.replaceState(options.history.state ?? null, "", nextUrl);
  }

  return nextUrl;
}

export function toViewerLocaleSpecUrl(specUrl: URL, locale: ViewerLocale): URL {
  const nextUrl = new URL(specUrl.href);
  const pathnameSegments = nextUrl.pathname.split("/");
  const fileName = pathnameSegments.pop() ?? "";

  pathnameSegments.push(toViewerLocaleArtifactFileName(fileName, locale));
  nextUrl.pathname = pathnameSegments.join("/");

  return nextUrl;
}

function toViewerLocaleArtifactFileName(fileName: string, locale: ViewerLocale): string {
  const extensionStart = fileName.lastIndexOf(".");
  const hasExtension = extensionStart > 0;
  const stem = hasExtension ? fileName.slice(0, extensionStart) : fileName;
  const extension = hasExtension ? fileName.slice(extensionStart) : "";

  return `${stripSupportedLocaleSuffix(stem)}.${locale}${extension}`;
}

function stripSupportedLocaleSuffix(stem: string): string {
  for (const locale of VIEWER_LOCALES) {
    const suffix = `.${locale}`;

    if (stem.endsWith(suffix)) {
      return stem.slice(0, -suffix.length);
    }
  }

  return stem;
}

function safeLocalStorageReader(): ViewerLocaleStorageReader | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeLocalStorageWriter(): ViewerLocaleStorageWriter | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
