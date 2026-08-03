import assert from "node:assert/strict";
import test from "node:test";
import { agentOrchestrationService } from "../implementation/service";

test("agent orchestration lists canonical plans", () => {
  const plans = agentOrchestrationService.listPlans();

  assert.ok(plans.length >= 2);
  assert.ok(plans.some((plan) => plan.id === "orchestrate-requirement-delivery"));
  assert.ok(plans.some((plan) => plan.id === "orchestrate-evidence-review"));
});

test("agent orchestration dispatches requirement delivery plan", () => {
  const result = agentOrchestrationService.dispatch({
    planId: "orchestrate-requirement-delivery",
  });

  assert.equal(result.status, "completed");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].agentRole, "delivery-agent");
  assert.equal(result.steps[0].status, "passed");
});

test("agent orchestration dispatches evidence review plan", () => {
  const result = agentOrchestrationService.dispatch({
    planId: "orchestrate-evidence-review",
  });

  assert.equal(result.status, "completed");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].agentRole, "evidence-agent");
  assert.equal(result.steps[0].status, "passed");
});
