import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  readProductBindingManifest,
  resolveProductBindingPath,
  resolveProductWorkspaceManifestPath,
} from "../src/product-binding-runtime.ts";
import { EOS_ROOT } from "../src/state.ts";
import { tryReadWorkspaceCapabilities } from "../src/workspace-capability-runtime.ts";

const productId = process.env.EOS_PRODUCT_BINDING_PRODUCT_ID;

if (!productId) {
  throw new Error("EOS_PRODUCT_BINDING_PRODUCT_ID is required for product binding proof tests.");
}

const workspaceRoot = resolve(EOS_ROOT, "workspace");
const bindingPath = resolveProductBindingPath({ workspaceRoot, productId });
const manifestPath = resolveProductWorkspaceManifestPath({ workspaceRoot, productId });
const binding = readProductBindingManifest(bindingPath);

test("product binding resolves to the canonical web experience surface", () => {
  assert.equal(binding.product?.id, productId);
  assert.equal(binding.experience?.surface, "web");
  assert.equal(binding.experience?.route, "/requirements");
  assert.equal(
    manifestPath,
    resolve(workspaceRoot, "apps/web/workspace.manifest.ts"),
  );
});

test("resolved experience surface exposes the shared requirement capability", () => {
  assert.deepEqual(tryReadWorkspaceCapabilities(manifestPath), ["requirement-management"]);

  const workspaceBindingSource = readFileSync(
    resolve(workspaceRoot, "apps/web/workspace.binding.ts"),
    "utf8",
  );
  assert.match(workspaceBindingSource, /id:\s*"web"/);
  assert.match(workspaceBindingSource, /"requirement-management"/);
});

test("resolved route reuses the existing Requirement experience implementation", () => {
  const routeSource = readFileSync(
    resolve(workspaceRoot, "apps/web/app/requirements/page.tsx"),
    "utf8",
  );
  const requirementViewSource = readFileSync(
    resolve(
      workspaceRoot,
      "capabilities/requirement-management/experience/views/RequirementView.tsx",
    ),
    "utf8",
  );

  assert.match(routeSource, /RequirementView/);
  assert.match(requirementViewSource, /RequirementWorkspace/);
});

test("web experience surface source remains product-agnostic", () => {
  const files = [
    resolve(workspaceRoot, "apps/web/app/page.tsx"),
    resolve(workspaceRoot, "apps/web/app/requirements/page.tsx"),
    resolve(workspaceRoot, "apps/web/components/ProfessionalWorkspaceIntro.tsx"),
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8").toLowerCase();
    assert.equal(source.includes("lawyershub"), false);
    assert.equal(source.includes("services-id"), false);
    assert.equal(source.includes("indonesialawyersclub"), false);
    assert.equal(source.includes("ilc"), false);
  }
});
