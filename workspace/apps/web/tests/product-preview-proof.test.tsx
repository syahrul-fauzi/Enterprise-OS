import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProductPreviewPage from "../app/products/[productId]/page";
import ProductRequirementPreviewPage from "../app/products/[productId]/requirements/page";

test("services-id preview route renders the Services.ID product context", async () => {
  const html = renderToStaticMarkup(
    await ProductPreviewPage({
      params: Promise.resolve({ productId: "services-id" }),
    }),
  );

  assert.ok(html.includes("Services.ID"));
  assert.ok(html.includes("services-id"));
  assert.ok(html.includes("/products/services-id/requirements"));
});

test("lawyershub preview route renders the LawyersHub product context", async () => {
  const html = renderToStaticMarkup(
    await ProductPreviewPage({
      params: Promise.resolve({ productId: "lawyershub" }),
    }),
  );

  assert.ok(html.includes("LawyersHub"));
  assert.ok(html.includes("lawyershub"));
  assert.ok(html.includes("/products/lawyershub/requirements"));
});

test("ilc preview route renders the Indonesia Lawyers Club product context", async () => {
  const html = renderToStaticMarkup(
    await ProductPreviewPage({
      params: Promise.resolve({ productId: "ilc" }),
    }),
  );

  assert.ok(html.includes("Indonesia Lawyers Club"));
  assert.ok(html.includes("ilc"));
  assert.ok(html.includes("/products/ilc/requirements"));
});

test("product requirement preview route reuses the shared requirement capability", async () => {
  const html = renderToStaticMarkup(
    await ProductRequirementPreviewPage({
      params: Promise.resolve({ productId: "lawyershub" }),
    }),
  );

  assert.ok(html.includes("LawyersHub requirement workflow"));
  assert.ok(html.includes("The same shared requirement capability is rendered here"));
  assert.ok(html.includes("Requirements"));
});
