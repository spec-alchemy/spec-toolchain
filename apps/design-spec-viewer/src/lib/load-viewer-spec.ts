import type { BusinessViewerSpec } from "../types";

export async function loadViewerSpec(): Promise<BusinessViewerSpec> {
  const specUrl = new URL(
    "generated/viewer-spec.json",
    window.location.origin + import.meta.env.BASE_URL
  );

  const response = await fetch(specUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load ${specUrl.pathname} (${response.status} ${response.statusText})`
    );
  }

  return response.json() as Promise<BusinessViewerSpec>;
}
