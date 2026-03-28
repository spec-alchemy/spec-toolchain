import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Legend } from "../src/components/Legend";

test("legend keeps stable DOM markers across layout variants", () => {
  const overlayMarkup = renderToStaticMarkup(
    createElement(Legend, {
      variant: "overlay"
    })
  );
  const stackedMarkup = renderToStaticMarkup(
    createElement(Legend, {
      variant: "stacked"
    })
  );

  assert.match(overlayMarkup, /data-component="legend"/);
  assert.match(overlayMarkup, /data-variant="overlay"/);
  assert.equal((overlayMarkup.match(/data-slot="legend-item"/g) ?? []).length, 14);
  assert.match(stackedMarkup, /data-component="legend"/);
  assert.match(stackedMarkup, /data-variant="stacked"/);
});
