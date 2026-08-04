import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlatformPage from "../app/platform/page";
import CasesPage from "../app/cases/page";
import DocumentsPage from "../app/documents/page";
import RequirementsPage from "../app/requirements/page";
import { CaseWorkspace } from "../../../capabilities/legal-case/experience/workspaces/CaseWorkspace";
import { DocumentWorkspace } from "../../../capabilities/legal-document/experience/workspaces/DocumentWorkspace";
import { RequirementWorkspace } from "../../../capabilities/requirement-management/experience/workspaces/RequirementWorkspace";

test("enterprise UI platform console renders core operational sections", async () => {
  const jsx = PlatformPage();
  const html = renderToStaticMarkup(jsx);

  assert.ok(html.includes("Platform Console"));
  assert.ok(html.includes("API Platform Surface"));
  assert.ok(html.includes("Workflow Engine"));
  assert.ok(html.includes("Delivery Readiness"));
  assert.ok(html.includes("traceability complete"));
  assert.ok(html.includes("Evidence Inventory"));
});

test("enterprise UI exposes direct capability routes for launch surfaces", async () => {
  assert.equal(typeof CasesPage, "function");
  assert.equal(typeof DocumentsPage, "function");
  assert.equal(typeof RequirementsPage, "function");

  const casesHtml = renderToStaticMarkup(<CaseWorkspace />);
  const documentsHtml = renderToStaticMarkup(<DocumentWorkspace />);
  const requirementsHtml = renderToStaticMarkup(<RequirementWorkspace />);

  assert.ok(casesHtml.includes("Legal Cases"));
  assert.ok(documentsHtml.includes("Legal Documents"));
  assert.ok(documentsHtml.includes("showing"));
  assert.ok(requirementsHtml.includes("Requirement Management"));
});
