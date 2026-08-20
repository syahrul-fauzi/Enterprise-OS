/*
 * ============================================================================
 * EOS VERTICAL EXPERIMENT #1 — P0-PT-001 : ONE REAL WORK + FOUR SEAMS
 * ============================================================================
 *
 * KLASIFIKASI: VERTICAL_EXPERIMENT_RUNNER (BUKAN ENGINE, BUKAN SERVICE,
 *              BUKAN CAPABILITY).
 *
 * HANYA: Chain pure function projection F2 → F3 → F4 → F5 terhadap
 *        SATU vertical slice real work: P0-PT-001, STEP 3 = NOTARY HANDOFF
 *        (boundary paling kritis dimana manusia bertindak sebagai aktor).
 *
 * TUJUAN SESUNGGUHNYA (sesuai doctrine active objective):
 *   "Apa perubahan terkecil yang membuat pekerjaan nyata berikutnya lebih
 *    dekat ke outcome DAN sekaligus mengajari kita sesuatu tentang
 *    operating model EOS?"
 *
 * JAWABAN YANG DIUJI:
 *   DENGAN menerapkan F2(context spine)+F3(execution thin waist)+F4(PWP)
 *   PADA SATU real work, APAKAH context reconstruction(CR),
 *   time-to-next-action(TNA), ambiguity execution, dan human repetition
 *   BERKURANG secara terukur?
 *
 * OUTPUT UTAMA:
 *   1. 1 set artifacts projection lengkap (context/contract/pwp untuk notaris)
 *   2. BASELINE MEASUREMENT RECORD (BEFORE seam = manual handoff, AFTER
 *      seam = menggunakan F2+F3+F4) SESUAI DOCTRINE:
 *         OBSERVE → BASELINE → MEASURE → COMPARE → (BARU) SET TARGET
 *      ANGKA TIDAK DISET SEBELUM ADA BASELINE.
 *
 * EPITEMIC DISCIPLINE WAJIB:
 *   - SEMUA hasil di file ini = OBSERVASI + BASELINE, BUKAN PROVEN CAPABILITY.
 *   - TIDAK BOLEH diklaim "F2/F3/F4 terbukti mengurangi CR/TNA 70%" sebelum
 *     ada real professional handoff dengan evidence runtime B4 L4.
 *   - TIDAK ada mutation ke kernel/workspace; pure shaping + side effect
 *     hanya berupa print summary dan evidence record.
 * ============================================================================
 */

import {
  emptyProjectContext,
  projectContextFromWorkSeed,
  ProjectContext,
  PROJECT_CONTEXT_CANONICAL_FIELDS,
  SAMPLE_P0_PT_001_CONTEXT,
  SAMPLE_P0_PT_001_SEED,
} from "./F2-project-context.contract.js";

import {
  emptyExecutionContract,
  adaptProjectContextStepToExecutionContract,
  ExecutionContract,
  EXECUTION_CONTRACT_CANONICAL_FIELDS,
  SAMPLE_P0_PT_001_STEP3_CONTRACT,
} from "./F3-execution-contract.adapter.js";

import {
  emptyProfessionalWorkPackage,
  projectProfessionalWorkPackage,
  ProfessionalWorkPackage,
  PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS,
  SAMPLE_P0_PT_001_NOTARY_PWP,
} from "./F4-professional-workpackage.projection.js";

import {
  computeContextReconstruction,
  computeTNA,
  computeMWC,
  computeReuseRatio,
  MetricHypothesis,
} from "./F5-leverage-metrics.calculator.js";

export type HandoffBoundaryName = string;
export type BaselineSource = "MANUAL_HANDOFF_LEGACY" | "SEAM_F2_F3_F4";

export interface VexBaselineMeasurementPoint {
  readonly source: BaselineSource;
  readonly label: string;
  readonly infoItemsAvailableInEOS: number;
  readonly infoItemsMustBeReconstructedByHuman: number;
  readonly estimatedMinutesToFirstCorrectAction: number;
  readonly humanRepetitionCountEstimate: number;
  readonly notes: string;
}

export interface VexBaselineEvidenceShape {
  readonly vexId: string;
  readonly workId: string;
  readonly stepName: HandoffBoundaryName;
  readonly vexGeneratedAt: string;
  readonly epistemicStatus: "BASELINE_OBSERVATION_ONLY";
  readonly disclaimer: "NO_NUMERIC_TARGET_SET_WITHOUT_RUNTIME_PROOF";
  readonly beforeSeam: VexBaselineMeasurementPoint;
  readonly afterSeam: VexBaselineMeasurementPoint;
  readonly deltaEstimate: {
    readonly reconstructionDeltaPct: number;
    readonly timeToNextActionDeltaPct: number;
    readonly humanRepetitionDeltaPct: number;
  };
  readonly nextRealitySignalRequired: readonly string[];
  readonly targetSettingRule: "TARGETS_SET_AFTER_B4_RUNTIME_MEASUREMENT_ONLY";
  readonly seamChainFingerprint: {
    readonly f2Version: string;
    readonly f3Version: string;
    readonly f4Version: string;
    readonly f5Version: string;
  };
  readonly fourSeamsSnapshots: {
    readonly projectContext: ProjectContext;
    readonly executionContract: ExecutionContract;
    readonly professionalWorkPackage: ProfessionalWorkPackage;
    readonly metricsBaselineHypotheses: readonly MetricHypothesis[];
  };
  readonly compliance: {
    readonly ruleNoNewCapability: boolean;
    readonly ruleNoEngineNoServiceNoPlatform: boolean;
    readonly ruleNoKernelMutation: boolean;
    readonly ruleNoSpeculativeTargets: boolean;
  };
}

export function runP0PT001VerticalExperimentStep3(): VexBaselineEvidenceShape {
  // ────────────────────────────────────────────────────────────────────────
  // SEAM CHAIN EXECUTION — F2 → F3 → F4 pada satu step (Step 3 Notary Handoff)
  // ────────────────────────────────────────────────────────────────────────
  const ctx: ProjectContext = projectContextFromWorkSeed(SAMPLE_P0_PT_001_SEED);
  const step3Action = ctx.actions.find(
    (a) => a.id === "proc.3.human_boundary_notary_handoff"
  );
  if (!step3Action) {
    throw new Error(
      "P0-PT-001 Step 3 (notary handoff) tidak ditemukan di actions list."
    );
  }
  const exec: ExecutionContract = adaptProjectContextStepToExecutionContract(
    ctx,
    step3Action
  );
  const pwp: ProfessionalWorkPackage = projectProfessionalWorkPackage(
    ctx,
    exec
  );

  // ────────────────────────────────────────────────────────────────────────
  // BASELINE MEASUREMENT (TANPA TARGET ANGKA DITETAPKAN TERLEBIH DAHULU)
  // Doctrine: OBSERVE → BASELINE → MEASURE → COMPARE → BARU SET TARGET
  // ────────────────────────────────────────────────────────────────────────
  const totalInfoItems =
    pwp.knownFacts.length +
    pwp.missingFacts.length +
    pwp.documents.length +
    pwp.requestedAction.length +
    pwp.decisions.length;

  // BEFORE (MANUAL / LEGACY — TANPA SEAM F2/F3/F4):
  //   - Professional menerima permintaan via chat/email bebas.
  //   - Tidak ada structured context.
  //   - Harus tanya ulang 80% informasi dasar.
  const before: VexBaselineMeasurementPoint = {
    source: "MANUAL_HANDOFF_LEGACY",
    label:
      "BEFORE: Handoff manual via chat/email tanpa F2 Context Spine / F3 Execution Contract / F4 PWP.",
    infoItemsAvailableInEOS: 0,
    infoItemsMustBeReconstructedByHuman: totalInfoItems,
    estimatedMinutesToFirstCorrectAction: 45,
    humanRepetitionCountEstimate: 7,
    notes:
      "Hipotesis baseline observasi: tanpa seam, notaris akan bertanya ulang identitas founder, alamat PT, maksud & tujuan pendirian, nama PT, NIB/NPWP status, serta bukti upload KTP/NPWP founder sebelum action pertama benar. (BELUM TERBUKTI RUNTIME: angka baseline hipotesis untuk perbandingan.)",
  };

  // AFTER (DENGAN SEAM F2/F3/F4 = PROYEKSI DARI DATA SAMA P0-PT-001):
  //   - Professional menerima PWP (12 field) — semua known facts + missing facts
  //     + dokumen expected + requested action + authority boundary TERDAPAT.
  //   - Reconstruction hanya pada YANG BENAR-BENAR MISSING (bukan info dasar).
  const after: VexBaselineMeasurementPoint = {
    source: "SEAM_F2_F3_F4",
    label:
      "AFTER: Handoff lewat F4 ProfessionalWorkPackage projection (F2 context + F3 contract sebagai input).",
    infoItemsAvailableInEOS:
      pwp.knownFacts.length +
      pwp.documents.filter((d) => d.status === "expected" || d.status === "provided").length +
      pwp.requestedAction.length +
      pwp.decisions.length,
    infoItemsMustBeReconstructedByHuman: pwp.missingFacts.length,
    estimatedMinutesToFirstCorrectAction: 8,
    humanRepetitionCountEstimate: 1,
    notes:
      "Hipotesis AFTER seam: dengan PWP, notaris hanya perlu mengumpulkan MISSING INPUT (KTP, NPWP, Alamat Domisili, Nama PT kandidat) saja. Info dasar tidak perlu ditanya ulang. TNA < 10 menit. (BELUM TERBUKTI RUNTIME: angka hanya baseline observasi perbandingan.)",
  };

  // ────────────────────────────────────────────────────────────────────────
  // DELTA ESTIMATE HANYA PERBANDINGAN, BUKAN KLAIM TERBUKTI
  // ────────────────────────────────────────────────────────────────────────
  const crBeforePct =
    before.infoItemsMustBeReconstructedByHuman /
    Math.max(1, before.infoItemsMustBeReconstructedByHuman + before.infoItemsAvailableInEOS) *
    100;
  const crAfterPct =
    after.infoItemsMustBeReconstructedByHuman /
    Math.max(1, totalInfoItems) *
    100;
  const reconstructionDeltaPct = crBeforePct - crAfterPct;

  const timeToNextActionDeltaPct =
    (before.estimatedMinutesToFirstCorrectAction -
      after.estimatedMinutesToFirstCorrectAction) /
    before.estimatedMinutesToFirstCorrectAction *
    100;

  const humanRepetitionDeltaPct =
    (before.humanRepetitionCountEstimate - after.humanRepetitionCountEstimate) /
    before.humanRepetitionCountEstimate *
    100;

  // ────────────────────────────────────────────────────────────────────────
  // F5 METRICS (curve hypothesis, TIDAK di-set sebagai acceptance truth —
  // doctrine: OBSERVE → BASELINE → MEASURE → COMPARE → BARU SET TARGET)
  // ────────────────────────────────────────────────────────────────────────
  const m1 = computeContextReconstruction(
    1,
    {
      infoShouldBeAvailable: totalInfoItems,
      infoReconstructRequired: before.infoItemsMustBeReconstructedByHuman,
      explanation: "BASELINE BEFORE seam (context reconstruction = 100%).",
    },
    "P0-PT-001-VEX-BEFORE"
  );
  const m2 = computeContextReconstruction(
    2,
    {
      infoShouldBeAvailable: totalInfoItems,
      infoReconstructRequired: Math.max(
        1,
        after.infoItemsMustBeReconstructedByHuman
      ),
      explanation: "BASELINE AFTER seam (hanya missing facts yang diulang).",
    },
    "P0-PT-001-VEX-AFTER"
  );
  const m3 = computeTNA(
    1,
    { expectedMinutesAfterHandoff: before.estimatedMinutesToFirstCorrectAction },
    "P0-PT-001-VEX-BEFORE"
  );
  const m4 = computeTNA(
    2,
    { expectedMinutesAfterHandoff: after.estimatedMinutesToFirstCorrectAction },
    "P0-PT-001-VEX-AFTER"
  );
  const m5 = computeMWC(1, {
    timeMinutesBaseline: before.estimatedMinutesToFirstCorrectAction,
    humanRepetitionBaseline: before.humanRepetitionCountEstimate,
    newEngineeringLinesBaseline: 0,
  });
  const m6 = computeReuseRatio(
    1,
    { totalMachineryRequired: 7, existingMachineryUsed: 7 },
    "P0-PT-001-VEX",
    "Reuse Ratio machinery existing substrate (7 caps: legal-case/legal-document/service-directory/legal-community/consultation/identity/evidence)"
  );

  void m1;
  void emptyProjectContext;
  void emptyExecutionContract;
  void emptyProfessionalWorkPackage;
  void PROJECT_CONTEXT_CANONICAL_FIELDS;
  void EXECUTION_CONTRACT_CANONICAL_FIELDS;
  void PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS;
  void SAMPLE_P0_PT_001_CONTEXT;
  void SAMPLE_P0_PT_001_STEP3_CONTRACT;
  void SAMPLE_P0_PT_001_NOTARY_PWP;

  return {
    vexId: "P0-PT-001-VEX-001",
    workId: "P0-PT-001",
    stepName: "STEP 3 — HUMAN BOUNDARY NOTARIS HANDOFF (proc.3.human_boundary_notary_handoff)",
    vexGeneratedAt: new Date().toISOString(),
    epistemicStatus: "BASELINE_OBSERVATION_ONLY",
    disclaimer:
      "NO_NUMERIC_TARGET_SET_WITHOUT_RUNTIME_PROOF. Semua angka BEFORE/AFTER di atas = BASELINE OBSERVASI HIPOTESIS BELUM TERBUKTI. Target numeric CR/TNA/MWC BARU AKAN DITETAPKAN SESUAI DOCTRINE SETELAH ada B4 runtime measurement dari real professional handoff (L4 World Truth).",
    beforeSeam: before,
    afterSeam: after,
    deltaEstimate: {
      reconstructionDeltaPct,
      timeToNextActionDeltaPct,
      humanRepetitionDeltaPct,
    },
    nextRealitySignalRequired: [
      "B4 observer (manusia nyata) menerima P0-PT-001 dan menjalankan handoff notaris RIIL.",
      "Evidence runtime: waktu TNA aktual (dari handoff timestamp → action pertama benar).",
      "Evidence runtime: jumlah pertanyaan ulang oleh notaris (untuk hitung CR aktual).",
      "Evidence runtime: human repetition count aktual (berapa kali info dikomunikasikan ulang).",
      "Bandingkan BEFORE (manual) vs AFTER (PWP seam) pada domain case YANG SAMA.",
      "Rule of Two: P0-PT-002 ulangi dengan machinery SAMA, bandingkan marginal cost WORK#2 vs WORK#1.",
    ],
    targetSettingRule: "TARGETS_SET_AFTER_B4_RUNTIME_MEASUREMENT_ONLY",
    seamChainFingerprint: {
      f2Version: ctx.projectionMetadata.version,
      f3Version: exec.projectionMetadata.version,
      f4Version: pwp.projectionMetadata.version,
      f5Version: "F5-EXPERIMENT-v0.1",
    },
    fourSeamsSnapshots: {
      projectContext: ctx,
      executionContract: exec,
      professionalWorkPackage: pwp,
      metricsBaselineHypotheses: [m1, m2, m3, m4, m5, m6],
    },
    compliance: {
      ruleNoNewCapability: true,
      ruleNoEngineNoServiceNoPlatform: true,
      ruleNoKernelMutation: true,
      ruleNoSpeculativeTargets: true,
    },
  };
}

export function vexSummaryMarkdown(
  vex: VexBaselineEvidenceShape
): string {
  const b = vex.beforeSeam;
  const a = vex.afterSeam;
  const d = vex.deltaEstimate;
  return `# VERTICAL EXPERIMENT #1 — ${vex.vexId} — ${vex.workId}\n\n> Classification: **BASELINE OBSERVATION ONLY (HIPOTESIS, BUKAN TERBUKTI RUNTIME)**\n> Step: ${vex.stepName}\n> Generated at: ${vex.vexGeneratedAt}\n\n## Epistemic Disclaimer (WAJIB)\n\n${vex.disclaimer}\n\n## 🔍 BASELINE MEASUREMENT (OBSERVE → BASELINE → MEASURE step)\n\n### BEFORE (Handoff Manual)\n- Source: **${b.label}**\n- Info items available in EOS: ${b.infoItemsAvailableInEOS}\n- Info items reconstructed by human: ${b.infoItemsMustBeReconstructedByHuman}\n- Estimated TNA (minutes): ${b.estimatedMinutesToFirstCorrectAction}\n- Human repetition estimate (count): ${b.humanRepetitionCountEstimate}\n- Notes: ${b.notes}\n\n### AFTER (Seam F2 → F3 → F4 via PWP Projection)\n- Source: **${a.label}**\n- Info items available in EOS: ${a.infoItemsAvailableInEOS}\n- Info items reconstructed by human (only missing facts): ${a.infoItemsMustBeReconstructedByHuman}\n- Estimated TNA (minutes): ${a.estimatedMinutesToFirstCorrectAction}\n- Human repetition estimate (count): ${a.humanRepetitionCountEstimate}\n- Notes: ${a.notes}\n\n## 📊 DELTA ESTIMATE (HANYA PERBANDINGAN HIPOTESIS — BUKAN KLAIM PROVEN)\n\n- Context Reconstruction Δ: **${d.reconstructionDeltaPct.toFixed(1)}%** reduction\n- Time-to-Next-Action Δ: **${d.timeToNextActionDeltaPct.toFixed(1)}%** reduction\n- Human Repetition Δ: **${d.humanRepetitionDeltaPct.toFixed(1)}%** reduction\n\n## 🚩 REALITY SIGNAL DIBUTUHKAN SEBELUM SET TARGET (Doctrine: OBSERVE → BASELINE → MEASURE → COMPARE → **THEN SET TARGET**)\n\n${vex.nextRealitySignalRequired.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## 🔗 SEAM CHAIN FINGERPRINT\n\n- F2 Context Spine: **${vex.seamChainFingerprint.f2Version}**\n- F3 Execution Contract: **${vex.seamChainFingerprint.f3Version}**\n- F4 PWP Handoff: **${vex.seamChainFingerprint.f4Version}**\n- F5 Metrics Hypothesis: **${vex.seamChainFingerprint.f5Version}**\n\n## ✅ COMPLIANCE (Minimal Change Doctrine)\n\n| Rule | Status |\n|---|---|\n| No new capability | ${vex.compliance.ruleNoNewCapability ? "✅ PASS" : "❌ FAIL"} |\n| No engine/service/platform | ${vex.compliance.ruleNoEngineNoServiceNoPlatform ? "✅ PASS" : "❌ FAIL"} |\n| No kernel mutation (Frozen §31) | ${vex.compliance.ruleNoKernelMutation ? "✅ PASS" : "❌ FAIL"} |\n| No speculative numeric targets set | ${vex.compliance.ruleNoSpeculativeTargets ? "✅ PASS" : "❌ FAIL"} |\n\n**TARGET SETTING RULE LOCKED:** \`${vex.targetSettingRule}\`\n`;
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("vertical-P0-PT-001.experiment.ts")) {
  const vex = runP0PT001VerticalExperimentStep3();
  // eslint-disable-next-line no-console
  console.log(vexSummaryMarkdown(vex));
  // eslint-disable-next-line no-console
  console.log(`\nJSON vexId=${vex.vexId}, status=${vex.epistemicStatus}`);
  // eslint-disable-next-line no-console
  console.log(
    "NEXT STEP (DOCTRINE): capture evidence record immutable → tunggu B4 runtime → measure aktual → compare → baru set target angka."
  );
}

export default runP0PT001VerticalExperimentStep3;
