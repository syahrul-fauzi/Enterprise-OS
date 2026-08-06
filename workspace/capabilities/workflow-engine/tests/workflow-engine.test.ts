import assert from "node:assert/strict";
import test from "node:test";
import { workflowEngineService } from "../implementation/service";
import { prepareReleaseProcedure } from "../../../procedures/prepare-release";

test("workflow engine lists deterministic core workflow definitions", () => {
  const definitions = workflowEngineService.listWorkflowDefinitions();

  assert.ok(definitions.length >= 2);
  assert.ok(definitions.some((definition) => definition.id === "requirement-delivery-readiness"));
  assert.ok(definitions.some((definition) => definition.id === "evidence-run-review"));
  assert.ok(definitions.some((definition) => definition.id === "ai-investigate-requirement"));
  assert.ok(
    !definitions.some((definition) => definition.id === "prepare_release"),
    "prepare_release is a procedure (SSoT), not a workflow — must not appear in workflow definitions",
  );
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

test("DIV-001: prepare_release rejects workflow-engine path (procedure is SSoT canonical path)", () => {
  const result = workflowEngineService.executeWorkflow({
    workflowId: "prepare_release",
    releaseId: "EOS-003",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.output.error, "workflow_not_found");
});

test("DIV-002: prepare_release AI branch = triggered + pending_result (no sync dispatch) via canonical procedure path", () => {
  const result = prepareReleaseProcedure({
    releaseId: "EOS-003",
  });

  assert.equal(result.readiness.status, "pending_ai_investigation");
  assert.deepEqual(result.execution, {
    status: "passed",
    reason: "intelligence_required",
  });
  assert.deepEqual(result.ai, {
    invoked: true,
    planId: "investigate-ambiguous-requirement",
    ambiguousRequirements: ["req-042"],
    invocationStatus: "triggered_pending_result",
  });
  assert.ok(
    result.steps.some(
      (step) =>
        step.stepId === "trigger-ai-investigation" &&
        step.status === "requires_human",
    ),
  );
});
