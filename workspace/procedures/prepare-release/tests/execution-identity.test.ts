import assert from "node:assert/strict";
import test from "node:test";
import { prepareReleaseProcedure } from "../implementation";
import { buildExecutionIdentityV1 } from "../../contracts";

test("Execution Identity V1 = procedure:subject (WORK IDENTITY locked semantic)", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-003");

  assert.equal(identity.executionId, "prepare_release:release/EOS-003");
  assert.equal(identity.procedure, "prepare_release");
  assert.equal(identity.canonicalSubject, "release/EOS-003");
});

test("executionId = stable across rerun on same canonical subject (not per-invocation)", () => {
  const runA = prepareReleaseProcedure({ releaseId: "EOS-003" });
  const runB = prepareReleaseProcedure({ releaseId: "EOS-003" });

  assert.equal(runA.executionId, runB.executionId, "different invocation, same procedure + same subject = SAME executionId (WORK IDENTITY)");
  assert.equal(runA.canonicalSubject, runB.canonicalSubject);
  assert.equal(runA.executionId, "prepare_release:release/EOS-003");
  assert.equal(runA.canonicalSubject, "release/EOS-003");

  assert.notEqual(runA.generatedAt, runB.generatedAt, "generatedAt = temporal observation (different per invocation), NOT identity");
});

test("different canonical subject = different executionId", () => {
  const release3 = prepareReleaseProcedure({ releaseId: "EOS-003" });
  const release7 = prepareReleaseProcedure({ releaseId: "EOS-007" });

  assert.notEqual(release3.executionId, release7.executionId);
  assert.equal(release3.executionId, "prepare_release:release/EOS-003");
  assert.equal(release7.executionId, "prepare_release:release/EOS-007");
});

test("cross-surface identity equality: CLI-like call shape ↔ Workspace-like call ↔ Chat-like call produce same work identity", () => {
  const cliLike = prepareReleaseProcedure({ releaseId: "EOS-003", limit: 50 });
  const workspaceLike = prepareReleaseProcedure({ releaseId: "EOS-003", limit: 100 });
  const chatLike = prepareReleaseProcedure({ releaseId: "EOS-003", limit: 100 });

  assert.equal(cliLike.executionId, workspaceLike.executionId);
  assert.equal(workspaceLike.executionId, chatLike.executionId);
  assert.equal(cliLike.executionId, "prepare_release:release/EOS-003");

  assert.equal(cliLike.procedure, "prepare_release");
  assert.equal(workspaceLike.procedure, "prepare_release");
  assert.equal(chatLike.procedure, "prepare_release");

  assert.equal(cliLike.canonicalSubject, workspaceLike.canonicalSubject);
  assert.equal(workspaceLike.canonicalSubject, chatLike.canonicalSubject);
});

test("procedure exports canonical subject + procedure alongside executionId (no invocationId present)", () => {
  const result = prepareReleaseProcedure({ releaseId: "EOS-003" });

  const keys = Object.keys(result);
  assert.ok(keys.includes("executionId"));
  assert.ok(keys.includes("procedure"));
  assert.ok(keys.includes("procedureId"));
  assert.ok(keys.includes("canonicalSubject"));
  assert.ok(!keys.includes("invocationId"), "invocationId is LOCKED OUT for Gate 2");
  assert.ok(!keys.includes("attemptId"), "attemptId is LOCKED OUT for Gate 2");
});

test("DIV-002: AI branch outputs triggered_pending_result and exposed via same executionId identity", () => {
  const result = prepareReleaseProcedure({ releaseId: "EOS-003" });

  assert.equal(result.readiness.status, "pending_ai_investigation");
  assert.equal(result.ai.invoked, true);
  assert.equal(result.ai.invocationStatus, "triggered_pending_result");
  assert.equal(result.executionId, "prepare_release:release/EOS-003");
  assert.ok(
    result.steps.some(
      (step) =>
        step.stepId === "trigger-ai-investigation" && step.status === "requires_human",
    ),
  );
});
