import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PlatformPage from "../app/platform/page";

test("enterprise UI platform console renders core operational sections", async () => {
  const jsx = PlatformPage();
  const html = renderToStaticMarkup(jsx);

  assert.ok(html.includes("Platform Console"));
  assert.ok(html.includes("API Platform Surface"));
  assert.ok(html.includes("Workflow Engine"));
  assert.ok(html.includes("Evidence Inventory"));
});
