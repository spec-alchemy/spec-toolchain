import assert from "node:assert/strict";
import test from "node:test";
import {
  loadViewerSpec
} from "../src/lib/load-viewer-spec";
import {
  resolveViewerLocale,
  syncViewerLocaleUrl,
  toViewerLocaleSpecUrl,
  VIEWER_LOCALE_STORAGE_KEY,
  writeViewerLocalePreference
} from "../src/lib/viewer-locale";

test("viewer locale resolution prefers lang URL param, then localStorage, then english default", () => {
  assert.deepEqual(
    resolveViewerLocale(
      new URL("https://example.com/viewer?lang=en"),
      {
        getItem: () => "zh-CN"
      }
    ),
    {
      locale: "en",
      source: "url"
    }
  );

  assert.deepEqual(
    resolveViewerLocale(
      new URL("https://example.com/viewer"),
      {
        getItem: () => "zh-CN"
      }
    ),
    {
      locale: "zh-CN",
      source: "storage"
    }
  );

  assert.deepEqual(
    resolveViewerLocale(
      new URL("https://example.com/viewer?lang=fr"),
      {
        getItem: () => "ja"
      }
    ),
    {
      locale: "en",
      source: "default"
    }
  );
});

test("viewer locale persistence writes the selected locale and syncs the lang query param", () => {
  const writes: Array<{ key: string; value: string }> = [];
  const historyCalls: Array<{ data: unknown; url: string }> = [];

  writeViewerLocalePreference("zh-CN", {
    setItem(key, value) {
      writes.push({
        key,
        value
      });
    }
  });

  const nextUrl = syncViewerLocaleUrl("zh-CN", {
    history: {
      state: {
        from: "test"
      },
      replaceState(data, _unused, url) {
        historyCalls.push({
          data,
          url: String(url)
        });
      }
    },
    locationUrl: new URL("https://example.com/viewer?spec=./artifacts/viewer-spec.json")
  });

  assert.deepEqual(writes, [
    {
      key: VIEWER_LOCALE_STORAGE_KEY,
      value: "zh-CN"
    }
  ]);
  assert.equal(nextUrl.searchParams.get("lang"), "zh-CN");
  assert.equal(nextUrl.searchParams.get("spec"), "./artifacts/viewer-spec.json");
  assert.deepEqual(historyCalls, [
    {
      data: {
        from: "test"
      },
      url: "https://example.com/viewer?spec=.%2Fartifacts%2Fviewer-spec.json&lang=zh-CN"
    }
  ]);
});

test("viewer locale artifact URLs stay sibling to the original spec and replace existing locale suffixes", () => {
  assert.equal(
    toViewerLocaleSpecUrl(
      new URL("https://example.com/generated/viewer-spec.json"),
      "zh-CN"
    ).href,
    "https://example.com/generated/viewer-spec.zh-CN.json"
  );
  assert.equal(
    toViewerLocaleSpecUrl(
      new URL("https://example.com/generated/viewer-spec.en.json?cache=off"),
      "zh-CN"
    ).href,
    "https://example.com/generated/viewer-spec.zh-CN.json?cache=off"
  );
});

test("viewer spec loader falls back to the original external artifact when the locale sibling is missing", async () => {
  const requestedUrls: string[] = [];

  const result = await loadViewerSpec({
    fetchImpl: async (input) => {
      const url = String(input);

      requestedUrls.push(url);

      if (url.endsWith("/viewer-spec.zh-CN.json")) {
        return new Response("missing", {
          status: 404,
          statusText: "Not Found"
        });
      }

      return new Response(
        JSON.stringify({
          viewerVersion: 1,
          specId: "demo",
          title: "Demo Workspace",
          summary: "Demo summary",
          detailHelp: {
            semantic: {}
          },
          views: []
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    },
    locale: "zh-CN",
    locationUrl: new URL("https://example.com/viewer?spec=/artifacts/viewer-spec.json"),
    source: {
      url: new URL("https://example.com/artifacts/viewer-spec.json"),
      label: "/artifacts/viewer-spec.json",
      isDefault: false
    }
  });

  assert.deepEqual(requestedUrls, [
    "https://example.com/artifacts/viewer-spec.zh-CN.json",
    "https://example.com/artifacts/viewer-spec.json"
  ]);
  assert.equal(result.locale, "zh-CN");
  assert.equal(result.loadedUrl.href, "https://example.com/artifacts/viewer-spec.json");
  assert.equal(result.fallback?.fallbackLabel, "/artifacts/viewer-spec.json");
  assert.match(result.fallback?.notice ?? "", /Localized viewer artifact unavailable for zh-CN/);
});

test("viewer spec loader silently falls back to the default artifact when the localized default spec is invalid", async () => {
  const requestedUrls: string[] = [];

  const result = await loadViewerSpec({
    fetchImpl: async (input) => {
      const url = String(input);

      requestedUrls.push(url);

      if (url.endsWith("/generated/viewer-spec.en.json")) {
        return new Response(
          JSON.stringify({
            viewerVersion: 9,
            specId: "demo",
            title: "Broken locale",
            summary: "Broken locale",
            detailHelp: {
              semantic: {}
            },
            views: []
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          viewerVersion: 1,
          specId: "demo",
          title: "Default Workspace",
          summary: "Default summary",
          detailHelp: {
            semantic: {}
          },
          views: []
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    },
    locale: "en",
    locationUrl: new URL("https://example.com/viewer"),
    source: {
      url: new URL("https://example.com/generated/viewer-spec.json"),
      label: "generated/viewer-spec.json",
      isDefault: true
    }
  });

  assert.deepEqual(requestedUrls, [
    "https://example.com/generated/viewer-spec.en.json",
    "https://example.com/generated/viewer-spec.json"
  ]);
  assert.equal(result.loadedLabel, "generated/viewer-spec.json");
  assert.equal(result.fallback?.notice, null);
});
