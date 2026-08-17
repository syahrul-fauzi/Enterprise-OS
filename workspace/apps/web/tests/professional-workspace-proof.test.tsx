import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "../app/page.js";
import RequirementsPage from "../app/requirements/page.js";
import ProfessionalWorkspaceIntro from "../components/ProfessionalWorkspaceIntro.js";
import * as RequirementViewModule from "../../../capabilities/requirement-management/experience/views/RequirementView.js";

test("professional workspace surface stays product-agnostic", () => {
  const html = renderToStaticMarkup(<Page />);
  assert.ok(html.includes("Professional Workspace"));
  assert.ok(html.includes("Turn incoming requests into clear, delivery-ready requirements."));
});

test("professional workspace intro renders generic experience metadata", () => {
  const html = renderToStaticMarkup(<ProfessionalWorkspaceIntro />);
  assert.ok(html.includes("Professional Workspace"));
  assert.ok(html.includes("Create, review, update, and advance requirements"));
  assert.ok(html.includes("Open Requirement Workspace"));
});

test("professional workspace exposes a generic requirement route", () => {
  assert.equal(typeof RequirementsPage, "function");
});

test("professional workspace proof reuses canonical Requirement experience", () => {
  assert.equal(typeof RequirementViewModule.RequirementView, "function");
  assert.ok("default" in RequirementViewModule);
});
