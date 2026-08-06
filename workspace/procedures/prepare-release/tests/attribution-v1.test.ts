import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ATTRIBUTION_V1,
  appendAttributionRecord,
  computeInputDigest,
  computeResultDigest,
  encodeFilesystemSafe,
  getLatestAttributionRecord,
  listAttributionRecords,
} from "../../attribution/implementation";
import type { EvaluationAttributionRecordV1 } from "../../attribution/contracts";
import {
  buildExecutionIdentityV1,
  toCanonicalSubjectKey,
} from "../../contracts";
import type { PrepareReleaseOutput } from "../contracts";

function makeTempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), "eos-attribution-test-")));
}

function withTempDir(fn: (tempDir: string) => void): void {
  const tempDir = makeTempDir();
  const original = process.env.EOS_ATTRIBUTION_BASE_DIR;
  try {
    process.env.EOS_ATTRIBUTION_BASE_DIR = tempDir;
    fn(tempDir);
  } finally {
    if (original === undefined) {
      delete process.env.EOS_ATTRIBUTION_BASE_DIR;
    } else {
      process.env.EOS_ATTRIBUTION_BASE_DIR = original;
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors in test
    }
  }
}

function makeMockOutput(overrides: Partial<PrepareReleaseOutput> = {}): PrepareReleaseOutput {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");
  return {
    executionId: identity.executionId,
    procedure: "prepare_release",
    procedureId: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
    releaseId: "EOS-001",
    execution: {
      status: "passed",
      reason: "blockers_found",
    },
    readiness: {
      status: "blocked",
    },
    requirements: {
      total: 10,
      verified: 7,
      blocked: 2,
      unknown: 1,
    },
    traceability: {
      complete: false,
      gaps: 2,
      gapRequirementIds: ["REQ-003", "REQ-007"],
    },
    evidence: {
      complete: true,
      total: 25,
      paths: ["/ev/one", "/ev/two", "/ev/three"],
    },
    ai: {
      invoked: false,
      planId: null,
      ambiguousRequirements: [],
      invocationStatus: null,
    },
    blockers: [
      "2 requirement(s) are in non-verifiable status",
      "2 traceability gap(s) must be resolved across 2 requirement(s)",
    ],
    steps: [],
    generatedAt: "2026-08-06T10:00:00.000Z",
    ...overrides,
  };
}

test("Attribution V1 record has exactly 7 canonical fields (LOCKED structure)", () => {
  withTempDir(() => {
    const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");
    const input = { releaseId: "EOS-001" };
    const output = makeMockOutput();

    const record = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output,
    });

    const fieldNames = Object.keys(record).sort();
    assert.deepEqual(
      fieldNames,
      [
        "canonicalSubject",
        "evaluatedAt",
        "executionId",
        "inputDigest",
        "procedure",
        "resultDigest",
        "version",
      ],
      "Attribution Record V1 must have exactly 7 fields — no invocationId, no attemptId, no sequence",
    );
    assert.equal(record.version, ATTRIBUTION_V1);
  });
});

test("Work Identity stability: same executionId across reruns → N records append-only, identity never mutates", () => {
  withTempDir(() => {
    const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");
    const input = { releaseId: "EOS-001" };
    const outputA = makeMockOutput({ generatedAt: "2026-08-06T10:00:00.000Z" });
    const outputB = makeMockOutput({ generatedAt: "2026-08-06T10:05:00.000Z" });
    const outputC = makeMockOutput({ generatedAt: "2026-08-06T10:10:00.000Z" });

    const recA = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outputA,
      evaluatedAt: "2026-08-06T10:00:00.000Z",
    });
    const recB = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outputB,
      evaluatedAt: "2026-08-06T10:05:00.000Z",
    });
    const recC = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outputC,
      evaluatedAt: "2026-08-06T10:10:00.000Z",
    });

    const all = listAttributionRecords({
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
    });

    assert.equal(all.length, 3, "3 reruns = 3 append-only records for same work identity");
    assert.equal(all[0].evaluatedAt, recA.evaluatedAt);
    assert.equal(all[1].evaluatedAt, recB.evaluatedAt);
    assert.equal(all[2].evaluatedAt, recC.evaluatedAt);

    for (const rec of all) {
      assert.equal(rec.executionId, identity.executionId, "executionId NEVER changes across reruns");
      assert.equal(rec.procedure, "prepare_release", "procedure NEVER changes");
      assert.equal(rec.canonicalSubject, identity.canonicalSubject, "canonicalSubject NEVER changes");
    }

    const latest = getLatestAttributionRecord({
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
    });
    assert.equal(latest?.evaluatedAt, recC.evaluatedAt, "latest = last appended (evaluatedAt most recent)");
  });
});

test("Digest determinism: identical semantic posture → identical resultDigest, even with different timestamps/steps", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");
  const input = { releaseId: "EOS-001" };

  const base = {
    execution: { status: "passed" as const, reason: "blockers_found" },
    readiness: { status: "blocked" as const },
    requirements: { total: 10, verified: 7, blocked: 2, unknown: 1 },
    traceability: { complete: false, gaps: 2, gapRequirementIds: ["REQ-003", "REQ-007"] },
    evidence: { complete: true, total: 25, paths: ["/ev/x", "/ev/y", "/ev/z"] },
  };

  const outA = makeMockOutput({
    ...base,
    generatedAt: "2026-08-06T10:00:00.000Z",
    steps: [{ stepId: "a", kind: "x", status: "passed", summary: "step a" }],
  });
  const outB = makeMockOutput({
    ...base,
    generatedAt: "2026-08-06T23:59:59.999Z",
    steps: [{ stepId: "b", kind: "y", status: "failed", summary: "COMPLETELY DIFFERENT STEP" }],
  });
  const outC = makeMockOutput({
    ...base,
    evidence: { ...base.evidence, paths: ["/ev/z", "/ev/x", "/ev/y"] },
    generatedAt: "2099-01-01T00:00:00.000Z",
  });

  const digestA = computeResultDigest(outA);
  const digestB = computeResultDigest(outB);
  const digestC = computeResultDigest(outC);

  assert.equal(digestA, digestB, "Different steps[] + different generatedAt + different ordering → SAME digest (presentation/temporal excluded)");
  assert.equal(digestB, digestC, "Different path ordering (paths aggregated via pathCount, raw order excluded) → SAME digest");

  withTempDir(() => {
    const recA = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outA,
    });
    const recB = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outB,
    });
    assert.equal(recA.resultDigest, recB.resultDigest, "Record-level digest matches projection-level digest");
  });
});

test("planId semantic constraint: ai.planId is EXCLUDED from canonical result projection V1", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");

  const aiBase = {
    invoked: true,
    ambiguousRequirements: ["REQ-042"],
    invocationStatus: "triggered_pending_result",
  };

  const noPlanId = makeMockOutput({
    ai: { ...aiBase, planId: null },
    generatedAt: "2026-08-06T10:00:00.000Z",
  });

  const withPlanIdA = makeMockOutput({
    ai: { ...aiBase, planId: "PLAN-SESSION-uuid-abcdef-123456" },
    generatedAt: "2026-08-06T10:00:00.000Z",
  });

  const withPlanIdB = makeMockOutput({
    ai: { ...aiBase, planId: "PLAN-SESSION-TOTALLY-DIFFERENT-UUID-99999" },
    generatedAt: "2026-08-06T10:00:00.000Z",
  });

  const d0 = computeResultDigest(noPlanId);
  const dA = computeResultDigest(withPlanIdA);
  const dB = computeResultDigest(withPlanIdB);

  assert.equal(d0, dA, "planId=null vs planId=uuid → SAME digest (planId EXCLUDED per Gate 3 constraint)");
  assert.equal(dA, dB, "Different planId values → SAME digest (planId EXCLUDED, prevents invocation identity leak)");

  withTempDir(() => {
    const input = { releaseId: "EOS-001" };
    const rec0 = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: noPlanId,
    });
    const recA = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: withPlanIdA,
    });
    assert.equal(rec0.resultDigest, recA.resultDigest, "Record-level: planId change does not alter resultDigest");
  });
});

test("execution.reason = contractual semantic → changes DO affect resultDigest", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");

  const basePosture = {
    readiness: { status: "blocked" as const },
    requirements: { total: 10, verified: 7, blocked: 2, unknown: 1 },
    traceability: { complete: false, gaps: 2, gapRequirementIds: ["REQ-003"] },
    evidence: { complete: true, total: 25, paths: ["/ev/1"] },
    ai: { invoked: false, planId: null as string | null, ambiguousRequirements: [] as string[], invocationStatus: null as string | null },
    blockers: ["x"],
  };

  const outInvalid = makeMockOutput({
    execution: { status: "failed" as const, reason: "invalid_input" },
    ...basePosture,
  });
  const outBlockers = makeMockOutput({
    execution: { status: "passed" as const, reason: "blockers_found" },
    ...basePosture,
  });
  const outAllPassed = makeMockOutput({
    execution: { status: "passed" as const, reason: "all_checks_passed" },
    ...basePosture,
  });
  const outIntelligence = makeMockOutput({
    execution: { status: "passed" as const, reason: "intelligence_required" },
    ...basePosture,
  });

  const dInvalid = computeResultDigest(outInvalid);
  const dBlockers = computeResultDigest(outBlockers);
  const dAllPassed = computeResultDigest(outAllPassed);
  const dIntel = computeResultDigest(outIntelligence);

  assert.notEqual(dInvalid, dBlockers, "reason=invalid_input vs blockers_found → DIFFERENT digest (contractual semantic)");
  assert.notEqual(dBlockers, dAllPassed, "reason=blockers_found vs all_checks_passed → DIFFERENT digest");
  assert.notEqual(dAllPassed, dIntel, "reason=all_checks_passed vs intelligence_required → DIFFERENT digest");
});

test("Semantic posture changes → digest MUST change; UI wording changes → digest MUST NOT change", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");

  const baseline = makeMockOutput({
    execution: { status: "passed", reason: "blockers_found" },
    readiness: { status: "blocked" },
    requirements: { total: 10, verified: 7, blocked: 2, unknown: 1 },
    traceability: { complete: false, gaps: 2, gapRequirementIds: ["REQ-003", "REQ-007"] },
    evidence: { complete: true, total: 25, paths: ["/ev/a", "/ev/b"] },
    ai: { invoked: false, planId: null, ambiguousRequirements: [], invocationStatus: null },
    blockers: ["2 blocked reqs", "2 traceability gaps"],
    generatedAt: "2026-08-06T10:00:00.000Z",
  });
  const baselineDigest = computeResultDigest(baseline);

  const differentGapIds = makeMockOutput({
    ...baseline,
    traceability: { complete: false, gaps: 2, gapRequirementIds: ["REQ-009", "REQ-011"] },
  });
  assert.notEqual(
    computeResultDigest(differentGapIds),
    baselineDigest,
    "Different gapRequirementIds = different semantic state → digest MUST change",
  );

  const differentRequirementCounts = makeMockOutput({
    ...baseline,
    requirements: { total: 11, verified: 7, blocked: 2, unknown: 2 },
  });
  assert.notEqual(
    computeResultDigest(differentRequirementCounts),
    baselineDigest,
    "Different requirement counts = different semantic posture → digest MUST change",
  );

  const differentReadiness = makeMockOutput({
    ...baseline,
    readiness: { status: "ready" },
    execution: { status: "passed", reason: "all_checks_passed" },
  });
  assert.notEqual(
    computeResultDigest(differentReadiness),
    baselineDigest,
    "readiness.status change → digest MUST change",
  );

  const differentAiPosture = makeMockOutput({
    ...baseline,
    ai: { invoked: true, planId: "anything", ambiguousRequirements: ["REQ-099"], invocationStatus: "triggered_pending_result" },
    requirements: { ...baseline.requirements, unknown: 1 },
  });
  assert.notEqual(
    computeResultDigest(differentAiPosture),
    baselineDigest,
    "ai.invoked + ambiguousRequirementCount change → digest MUST change",
  );

  const sameSemanticsDifferentOrdering = makeMockOutput({
    ...baseline,
    traceability: {
      complete: false,
      gaps: 2,
      gapRequirementIds: ["REQ-007", "REQ-003"],
    },
    blockers: ["2 traceability gaps", "2 blocked reqs"],
    generatedAt: "2099-12-31T23:59:59.999Z",
  });
  assert.equal(
    computeResultDigest(sameSemanticsDifferentOrdering),
    baselineDigest,
    "Ordering changes (arrays) + different timestamps → digest MUST NOT change (canonical sorted)",
  );
});

test("Filesystem-safe subject encoding: collision-free for pathological release IDs", () => {
  const cases: Array<[string, string]> = [
    ["release/EOS-003", "release__s__EOS-003"],
    ["release/v1.0.0:alpha", "release__s__v1.0.0__c__alpha"],
    ["release/my release", "release__s__my__sp__release"],
    ["release/a/b/c", "release__s__a__s__b__s__c"],
    ["release/colon:slash/pipe|star*", "release__s__colon__c__slash__s__pipe__p__star__a__"],
  ];
  for (const [raw, expected] of cases) {
    const encoded = encodeFilesystemSafe(raw as ReturnType<typeof toCanonicalSubjectKey>);
    assert.equal(encoded, expected, `${raw} → filesystem-safe encoding`);
    assert.ok(
      !/[\/\\:*?"<>| ]/.test(encoded),
      `Encoded ${encoded} must not contain filesystem-illegal chars`,
    );
  }
});

test("Timestamp collision accepted: 2 records identical evaluatedAt → both preserved append-only", () => {
  withTempDir(() => {
    const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-COLLIDE");
    const input = { releaseId: "EOS-COLLIDE" };
    const outputA = makeMockOutput({ releaseId: "EOS-COLLIDE", generatedAt: "2026-01-01T00:00:00.000Z" });
    const outputB = makeMockOutput({
      releaseId: "EOS-COLLIDE",
      generatedAt: "2026-01-01T00:00:00.000Z",
      blockers: ["DIFFERENT_BLOCKER"],
    });

    appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outputA,
      evaluatedAt: "2026-01-01T00:00:00.000Z",
    });
    appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: outputB,
      evaluatedAt: "2026-01-01T00:00:00.000Z",
    });

    const all = listAttributionRecords({
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
    });
    assert.equal(all.length, 2, "Same evaluatedAt → 2 distinct records preserved (no overwrite)");
    assert.equal(all[0].evaluatedAt, all[1].evaluatedAt, "Both records share identical timestamp");
    assert.notEqual(all[0].resultDigest, all[1].resultDigest, "Different posture → different digests; both retained");
  });
});

test("Restart durability: records written by first 'process' readable by second 'process' using same dir", () => {
  const sharedDir = makeTempDir();
  const original = process.env.EOS_ATTRIBUTION_BASE_DIR;
  try {
    const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-DURABLE");
    const input = { releaseId: "EOS-DURABLE" };
    const output = makeMockOutput({ releaseId: "EOS-DURABLE" });

    {
      process.env.EOS_ATTRIBUTION_BASE_DIR = sharedDir;
      const written = appendAttributionRecord({
        executionId: identity.executionId,
        procedure: "prepare_release",
        canonicalSubject: identity.canonicalSubject,
        input,
        output,
        evaluatedAt: "2026-08-06T12:00:00.000Z",
      });
      assert.equal(written.executionId, identity.executionId);
    }

    {
      process.env.EOS_ATTRIBUTION_BASE_DIR = sharedDir;
      const latest = getLatestAttributionRecord({
        procedure: "prepare_release",
        canonicalSubject: identity.canonicalSubject,
      });
      assert.ok(latest !== null, "After 'restart', latest record still available via filesystem");
      assert.equal(latest.executionId, identity.executionId);
      assert.equal(latest.evaluatedAt, "2026-08-06T12:00:00.000Z");
    }
  } finally {
    if (original === undefined) {
      delete process.env.EOS_ATTRIBUTION_BASE_DIR;
    } else {
      process.env.EOS_ATTRIBUTION_BASE_DIR = original;
    }
    try {
      rmSync(sharedDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test("Input projection fingerprint determinism: same releaseId+limit = same inputDigest; different limit = different digest (Step 2 final lock)", () => {
  const identityA = buildExecutionIdentityV1("prepare_release", "release/EOS-001");
  const identityB = buildExecutionIdentityV1("prepare_release", "release/EOS-999");

  const d1 = computeInputDigest({ releaseId: "EOS-001" }, { procedure: "prepare_release", canonicalSubject: identityA.canonicalSubject });
  const d2 = computeInputDigest({ releaseId: "EOS-001", limit: 50 }, { procedure: "prepare_release", canonicalSubject: identityA.canonicalSubject });
  const d3 = computeInputDigest({ releaseId: "EOS-001", limit: 999 }, { procedure: "prepare_release", canonicalSubject: identityA.canonicalSubject });
  const dSameLimit = computeInputDigest({ releaseId: "EOS-001", limit: 50 }, { procedure: "prepare_release", canonicalSubject: identityA.canonicalSubject });

  assert.notEqual(d1, d2, "Different limit values (null vs 50) → different inputDigest (limit is canonical per Step 2 final lock)");
  assert.notEqual(d2, d3, "Different limit values (50 vs 999) → different inputDigest (limit semantic input)");
  assert.equal(d2, dSameLimit, "Same releaseId + same limit → same inputDigest (deterministic)");

  const dOther = computeInputDigest({ releaseId: "EOS-999" }, { procedure: "prepare_release", canonicalSubject: identityB.canonicalSubject });
  assert.notEqual(d1, dOther, "Different releaseId + different canonicalSubject → different inputDigest");
});

test("No forbidden identity fields leak: attribution records contain NO invocationId/attemptId/sequence/counter", () => {
  withTempDir(() => {
    const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-FORBIDDEN");
    const input = { releaseId: "EOS-FORBIDDEN" };
    const output = makeMockOutput({ releaseId: "EOS-FORBIDDEN" });

    const record = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output,
    });

    const serialized = JSON.stringify(record);
    const recordAny = record as unknown as Record<string, unknown>;

    for (const forbidden of [
      "invocationId",
      "attemptId",
      "sequence",
      "counter",
      "uuid",
      "runId",
      "correlationId",
      "traceId",
    ]) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(recordAny, forbidden),
        `Forbidden identity field '${forbidden}' must NOT exist on attribution record`,
      );
      assert.ok(
        !new RegExp(`"${forbidden}"`).test(serialized),
        `Forbidden identity field '${forbidden}' must not appear in serialized record`,
      );
    }
  });
});

test("Empty history → list returns [] and latest returns null, not throws", () => {
  withTempDir(() => {
    const neverSeen = toCanonicalSubjectKey("release/NEVER-EVER-EXISTED");

    const list = listAttributionRecords({
      procedure: "prepare_release",
      canonicalSubject: neverSeen,
    });
    assert.deepEqual(list, []);

    const latest = getLatestAttributionRecord({
      procedure: "prepare_release",
      canonicalSubject: neverSeen,
    });
    assert.equal(latest, null);
  });
});
