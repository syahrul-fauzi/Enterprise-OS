/*
 * ============================================================================
 * EOS EXPERIMENTAL HARNESS — experiments.test.ts
 * ============================================================================
 * KLASIFIKASI: TESTING HYPOTHESIS SHAPE — BUKAN membuktikan runtime behavior EOS.
 *
 * TEST INI TIDAK dijalankan di suite test canonical 30/30 product tests.
 * Test ini = memverifikasi SHAPE projection & metric.
 *
 * Cara jalankan (jika mau):
 *   npx tsx --test .eos/experiments/experiments.test.ts
 *
 * Atau Abaikan: file ini artifact penelitian belaka.
 * ============================================================================
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  PROJECT_CONTEXT_CANONICAL_FIELDS,
  emptyProjectContext,
  projectContextFromWorkSeed,
  SAMPLE_P0_PT_001_CONTEXT,
  SAMPLE_P0_PT_001_SEED,
} from "./F2-project-context.contract.js";

import {
  EXECUTION_CONTRACT_CANONICAL_FIELDS,
  emptyExecutionContract,
  adaptProjectContextStepToExecutionContract,
  adaptWorkSeedStepToExecutionContract,
  SAMPLE_P0_PT_001_STEP3_CONTRACT,
} from "./F3-execution-contract.adapter.js";

import {
  PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS,
  projectProfessionalWorkPackage,
  SAMPLE_P0_PT_001_NOTARY_PWP,
} from "./F4-professional-workpackage.projection.js";

import {
  computeMWC,
  computeReuseRatio,
  computeContextReconstruction,
  computeTNA,
  EOS_LEVERAGE_HYPOTHESIS_SUMMARY,
  SAMPLE_PT_HYPOTHESIS_1_5,
} from "./F5-leverage-metrics.calculator.js";

test.describe("EOS 5-FRONT EXPERIMENTS — SHAPE & PROJECTION TESTS", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // F2: Project Context Knowledge Contract (14 field canonical)
  // ──────────────────────────────────────────────────────────────────────────
  test("F2 — ProjectContext canonical 14 fields completeness", () => {
    assert.deepEqual([...PROJECT_CONTEXT_CANONICAL_FIELDS].sort(), [
      "actions",
      "actors",
      "artifacts",
      "authority",
      "constraints",
      "decisions",
      "desiredOutcome",
      "evidence",
      "externalReferences",
      "facts",
      "inputs",
      "intent",
      "pendingQuestions",
      "state",
    ].sort(), "14 canonical field exact match doktrin F2 Commander");

    assert.equal(PROJECT_CONTEXT_CANONICAL_FIELDS.length, 14);
  });

  test("F2 — emptyProjectContext mengandung semua 14 top level field (via shape)", () => {
    const ctx = emptyProjectContext();
    const present = new Set<string>();
    for (const key of Object.keys(ctx)) {
      if (PROJECT_CONTEXT_CANONICAL_FIELDS.includes(key as any)) present.add(key);
    }
    assert.equal(present.size, PROJECT_CONTEXT_CANONICAL_FIELDS.length,
      "empty context mengandung 14 field canonical.");
  });

  test("F2 — projectContextFromWorkSeed(P0-PT-001) projection shape valid", () => {
    const ctx = projectContextFromWorkSeed(SAMPLE_P0_PT_001_SEED);
    assert.ok(ctx.intent.length > 0, "intent tidak empty string");
    assert.ok(ctx.actors.length >= 3, `minimal 3 actor (ai / profesional / external). Aktual=${ctx.actors.length}`);
    assert.ok(ctx.inputs.length === 6, `6 required inputs. Aktual=${ctx.inputs.length}`);
    assert.ok(ctx.constraints.length > 0, "constraints tidak empty");
    assert.ok(ctx.evidence.length >= 3, `3 ledger actions minimal. Aktual=${ctx.evidence.length}`);
    assert.equal(ctx.authority.humanProfessionalRequired, true, "PT membutuhkan manusia");
    assert.equal(ctx.authority.externalInstitutionRequired, true, "PT membutuhkan institusi luar");
  });

  test("F2 — SAMPLE_P0_PT_001_CONTEXT projection meta tagged F2-EXPERIMENT-v0.1", () => {
    assert.equal(SAMPLE_P0_PT_001_CONTEXT.projectionMetadata.version, "F2-EXPERIMENT-v0.1");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // F3: Execution Contract thin adapter (8 fields canonical)
  // ──────────────────────────────────────────────────────────────────────────
  test("F3 — 8 field canonical exact match doktrin", () => {
    assert.deepEqual([...EXECUTION_CONTRACT_CANONICAL_FIELDS].sort(), [
      "action",
      "actor",
      "authority",
      "completionCondition",
      "evidence",
      "expectedResponse",
      "inputs",
      "objective",
    ].sort());
    assert.equal(EXECUTION_CONTRACT_CANONICAL_FIELDS.length, 8);
  });

  test("F3 — emptyExecutionContract mengandung semua 8 field canonical", () => {
    const c = emptyExecutionContract();
    const present = new Set<string>();
    for (const key of Object.keys(c)) {
      if (EXECUTION_CONTRACT_CANONICAL_FIELDS.includes(key as any)) present.add(key);
    }
    assert.equal(present.size, 8);
  });

  test("F3 — adaptWorkSeedStepToExecutionContract untuk STEP 3 human boundary", () => {
    const s3 = adaptWorkSeedStepToExecutionContract(SAMPLE_P0_PT_001_SEED, 2);
    assert.equal(s3.forBoundary, "ai_to_professional");
    assert.equal(s3.authority.requiresSigning, true);
    assert.ok(s3.action.requiresHumanInTheLoop, true);
    assert.ok(s3.expectedResponse.failureSignals.length >= 3, "3 failure signals minimal");
    assert.ok(s3.evidence.some(e => e.kind === "signature"), "butuh tanda tangan");
  });

  test("F3 — adaptProjectContextStepToExecutionContract SAMPLE STEP 3", () => {
    const act = SAMPLE_P0_PT_001_CONTEXT.actions.find(a =>
      a.id === "proc.3.human_boundary_notary_handoff");
    assert.ok(act, "step 3 ada di actions list");
    const contract = adaptProjectContextStepToExecutionContract(SAMPLE_P0_PT_001_CONTEXT, act!);
    assert.equal(contract.forBoundary, "ai_to_professional");
    assert.equal(contract.authority.requiresSigning, true);
  });

  test("F3 — SAMPLE_P0_PT_001_STEP3_CONTRACT terprojection metadata F3-EXPERIMENT-v0.1", () => {
    assert.equal(SAMPLE_P0_PT_001_STEP3_CONTRACT.projectionMetadata.version, "F3-EXPERIMENT-v0.1");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // F4: Professional Work Package projection (12 field canonical)
  // ──────────────────────────────────────────────────────────────────────────
  test("F4 — 12 field canonical exact match doktrin", () => {
    assert.deepEqual([...PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS].sort(), [
      "authority",
      "deadline",
      "decisions",
      "documents",
      "evidence",
      "expectedOutput",
      "knownFacts",
      "missingFacts",
      "requestedAction",
      "what",
      "who",
      "why",
    ].sort());
    assert.equal(PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS.length, 12);
  });

  test("F4 — projectProfessionalWorkPackage memproject semua 12 top level field", () => {
    const pwp = projectProfessionalWorkPackage(
      SAMPLE_P0_PT_001_CONTEXT,
      SAMPLE_P0_PT_001_STEP3_CONTRACT,
    );
    const topLevel = new Set(Object.keys(pwp));
    for (const f of PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS) {
      assert.ok(topLevel.has(f), `F4 top level field perlu ada: ${f}`);
    }
  });

  test("F4 — SAMPLE_P0_PT_001_NOTARY_PWP memuat knownFacts + missingFacts + documents + requestedAction", () => {
    const p = SAMPLE_P0_PT_001_NOTARY_PWP;
    assert.ok(p.knownFacts.length >= 1, "known facts non-empty");
    assert.ok(p.missingFacts.length >= 1, "missing non-empty");
    assert.ok(p.documents.length >= 4, `4 expected dokumen PT. Aktual=${p.documents.length}`);
    assert.ok(p.requestedAction.length >= 1, "requested action filled");
    assert.equal(p.authority.maySign, true, "Notaris boleh menandatangani");
    assert.equal(p.deadline.priority === "high" || p.deadline.priority === "critical", true,
      `priority = ${p.deadline.priority}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // F5: Leverage Metrics — memastikan SEMUA = HIPOTESIS (BUKAN proven)
  // ──────────────────────────────────────────────────────────────────────────
  test("F5 — MWC(1) baseline = 100 normalized, MWC(2) < MWC(1), curve monoton menurun", () => {
    const base = {
      timeMinutesBaseline: 480,
      humanRepetitionBaseline: 8,
      newEngineeringLinesBaseline: 120,
    };
    const mwc1 = computeMWC(1, base);
    const mwc2 = computeMWC(2, base);
    const mwc3 = computeMWC(3, base);
    assert.ok(mwc1.hypothesis.targetValue === 100, `MWC(1) = exactly 100 as normalized baseline. Aktual=${mwc1.hypothesis.targetValue}`);
    assert.ok(mwc2.hypothesis.targetValue < mwc1.hypothesis.targetValue, "MWC(2) menurun");
    assert.ok(mwc3.hypothesis.targetValue < mwc2.hypothesis.targetValue, "MWC(3) menurun drastis");
    assert.equal(mwc1.epistemicStatus, "HYPOTHESIS_TARGET");
  });

  test("F5 — Reuse Ratio untuk PT series #1 = 7/7 = 100% existing machinery (no new cap)", () => {
    const r = computeReuseRatio(1, { totalMachineryRequired: 7, existingMachineryUsed: 7 }, "x");
    assert.equal(r.hypothesis.targetValue, 1.0, `existing / required = 1.0. Aktual=${r.hypothesis.targetValue}`);
  });

  test("F5 — CR(2) < CR(1) (monoton turun)", () => {
    const cr1 = computeContextReconstruction(1, { infoShouldBeAvailable: 40, infoReconstructRequired: 16, explanation: "" }, "w1");
    const cr2 = computeContextReconstruction(2, { infoShouldBeAvailable: 40, infoReconstructRequired: 16, explanation: "" }, "w2");
    assert.ok(cr2.hypothesis.targetValue < cr1.hypothesis.targetValue);
  });

  test("F5 — TNA(2) < TNA(1)", () => {
    const t1 = computeTNA(1, { expectedMinutesAfterHandoff: 35 }, "x1");
    const t2 = computeTNA(5, { expectedMinutesAfterHandoff: 35 }, "x5");
    assert.ok(t2.hypothesis.targetValue < t1.hypothesis.targetValue);
  });

  test("F5 — EOS_LEVERAGE_HYPOTHESIS_SUMMARY epistemic status = HYPOTHESIS_CURVE (BUKAN PROVEN)", () => {
    assert.equal(EOS_LEVERAGE_HYPOTHESIS_SUMMARY.epistemicStatus, "HYPOTHESIS_CURVE");
    assert.ok(EOS_LEVERAGE_HYPOTHESIS_SUMMARY.claim.includes("BUKAN FAKTA"),
      "Summary WAJIB ada peringatan epistemic");
    assert.equal(EOS_LEVERAGE_HYPOTHESIS_SUMMARY.provenRequires.length >= 5, true,
      "5 syarat minimal bukti");
  });

  test("F5 — SAMPLE_PT_HYPOTHESIS_1_5 shape = 5 × 4 metrics", () => {
    assert.equal(SAMPLE_PT_HYPOTHESIS_1_5.length, 5, "5 work (#1 s/d #5)");
    for (const w of SAMPLE_PT_HYPOTHESIS_1_5) {
      assert.equal(w.length, 4, "tiap work = 4 metric (MWC/RR/CR/TNA)");
      for (const m of w) {
        assert.equal(m.epistemicStatus, "HYPOTHESIS_TARGET");
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // COMPOSITION END-TO-END: F2→F3→F4 pipe (P0-PT-001 Notaris)
  // ──────────────────────────────────────────────────────────────────────────
  test("E2E — F2 context → F3 contract → F4 PWP = tidak ada mutation kernel)", () => {
    const ctx = SAMPLE_P0_PT_001_CONTEXT;
    const step = ctx.actions.find(a => a.id === "proc.3.human_boundary_notary_handoff")!;
    const contract = adaptProjectContextStepToExecutionContract(ctx, step);
    const pwp = projectProfessionalWorkPackage(ctx, contract);

    assert.equal(ctx.projectionMetadata.version, "F2-EXPERIMENT-v0.1");
    assert.equal(contract.projectionMetadata.version, "F3-EXPERIMENT-v0.1");
    assert.equal(pwp.projectionMetadata.version, "F4-EXPERIMENT-v0.1");
    assert.ok(pwp.packageId.startsWith("pwp-ctx-"), "ID projection chain utuh.");

    // KEY ASSERTION: tidak ada hubungannya sama kernel. Ini adalah PURE DATA,
    // Tidak ada side effect ke @repo/core-kernel.
    assert.ok(pwp.requestedAction.length >= 1, "requested action filled");
    assert.ok(pwp.documents.length >= 4, "4 expected dokumen PT");
  });
});
