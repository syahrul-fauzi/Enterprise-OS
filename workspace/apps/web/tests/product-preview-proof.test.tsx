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
  assert.ok(html.includes("Digital Service Platform"));
  assert.ok(html.includes("Verified Service Outcomes"));
  assert.ok(html.includes("Mulai Kebutuhan"));
  assert.ok(html.includes("What can I do here?"));
  assert.ok(html.includes("Lihat Cara Kerja"));
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
  assert.ok(html.includes("Legal-Service Marketplace"));
  assert.ok(html.includes("Accountable Legal Outcomes"));
  assert.ok(html.includes("Mulai Pekerjaan Hukum"));
  assert.ok(html.includes("Trust signal"));
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
  assert.ok(html.includes("Community Knowledge Surface"));
  assert.ok(html.includes("Trusted Community Signals"));
  assert.ok(html.includes("Jelajahi ILC"));
  assert.ok(html.includes("Bergabung dengan Komunitas"));
});

test("product requirement preview route reuses the shared requirement capability", async () => {
  const html = renderToStaticMarkup(
    await ProductRequirementPreviewPage({
      params: Promise.resolve({ productId: "lawyershub" }),
    }),
  );

  assert.ok(html.includes("LawyersHub legal matter workflow"));
  assert.ok(html.includes("Mulai Pekerjaan Hukum"));
  assert.ok(html.includes("responsible professional"));
  assert.ok(html.includes("Requirements"));
});
