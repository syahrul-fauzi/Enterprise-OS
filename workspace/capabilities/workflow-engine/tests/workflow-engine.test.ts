import assert from "node:assert/strict";
import test from "node:test";
import { workflowEngineService } from "../implementation/service";

test("workflow engine lists deterministic core workflow definitions", () => {
  const definitions = workflowEngineService.listWorkflowDefinitions();

  assert.ok(definitions.length >= 2);
  assert.ok(definitions.some((definition) => definition.id === "requirement-delivery-readiness"));
  assert.ok(definitions.some((definition) => definition.id === "evidence-run-review"));
});

test("workflow engine executes requirement delivery readiness flow", () => {
  const result = workflowEngineService.executeWorkflow({
    workflowId: "requirement-delivery-readiness",
    requirementId: "req-003",
  });

  assert.equal(result.status, "passed");
  assert.equal(result.output.readyForWorkflow, true);
  assert.ok(result.steps.some((step) => step.kind === "traceability.get"));
  assert.ok(result.steps.some((step) => step.kind === "evidence.search"));
});

test("workflow engine executes evidence run review flow", () => {
  const result = workflowEngineService.executeWorkflow({
    workflowId: "evidence-run-review",
    runId: "run-007",
  });

  assert.equal(result.status, "passed");
  assert.ok((result.output.matchedCount as number) > 0);
  assert.ok((result.output.acceptanceCount as number) > 0);
});
