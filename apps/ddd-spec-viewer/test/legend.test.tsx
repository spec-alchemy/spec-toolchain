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

test("legend localizes system item labels without changing DOM markers", () => {
  const markup = renderToStaticMarkup(
    createElement(Legend, {
      locale: "zh-CN",
      variant: "overlay"
    })
  );

  assert.match(markup, /图例/);
  assert.match(markup, /上下文/);
  assert.match(markup, /场景步骤/);
  assert.match(markup, /值对象/);
  assert.equal((markup.match(/data-slot="legend-item"/g) ?? []).length, 14);
});
