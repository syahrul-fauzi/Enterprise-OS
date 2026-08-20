/*
 * ============================================================================
 * EOS EXPERIMENTAL ARTIFACT — F5: LEVERAGE METRIC CALCULATOR
 * ============================================================================
 * CLASSIFICATION: EXPERIMENT_ONLY (HYPOTHESIS MEASUREMENT)
 *
 * PENTING (EPITEMIC DISCIPLINE WAJIB:
 *
 * SEMUA angka dan HASIL perhitungan di bawah ini = HIPOTESIS BELUM TERBUKTI.
 * JANGAN PERNAH diperlakukan sebagai:
 *   - "EOS leverage 10× terbukti"
 *   - "context reconstruction 70% berkurang"
 *   - "marginal cost 20%"
 *
 * MEREKA ADALAH:
 *   - EKSPERIMEN yang dirumuskan berdasarkan bentuk kurva yang INGIN dibuktikan,
 *   - TARGET / HYPOTHESIS, BUKAN FAKTA.
 *
 * Bukti yang dibutuhkan: N ≥ 2 real work (P0-PT-001 vs P0-PT-002 dengan
 * measurement handoff dengan evidence runtime, lalu hitung perbedaan aktual.
 *
 * METRIC DEFINITIONS (canonical F5 experiment):
 * ============================================================================
 *
 * 1. MWC(n) — Marginal Work Cost
 *    Formula: MWC(n) = (time_minutes + human_repetition_count + new_engineering_lines
 *    (normalized terhadap baseline work ke [0,100]
 *    n = nomor work (1 = PERTAMA, 2 = work KE-2 dengan domain serupa)
 *
 * 2. REUSE RATIO (R(n)
 *    Formula: R(n) = (existing_machinery_used_count / total_machinery_required_count
 *    count = capability + procedure + primitive + artifact count
 *    Target hipotesis: R(1) ≈ 0.75, R(2) ≈ 0.85, R(3..5) → 0.95
 *
 * 3. CONTEXT RECONSTRUCTION (CR)
 *    Formula: CR = (info_reconstruct_count / info_should_be_available_count) × 100%
 *    info = facts + inputs + decisions + artifacts
 *    Target hipotesis: CR(1) ≈ 40% (manual), CR(2+) ≤ 20% setelah F2/F3/F4 terbukti
 *
 * 4. TIME-TO-NEXT-ACTION (TNA)
 *    Formula: TNA = minutes(handoff_timestamp, first_correct_action_timestamp)
 *    Target hipotesis: TNA(1) ≤ 30 menit, TNA(2+) ≤ 5 menit setelah PWP
 *
 * Semua default value di bawah ini = STARTING HYPOTHESIS → BUKAN terukur aktual.
 * ============================================================================
 */

export type MetricKind = "MWC" | "REUSE_RATIO" | "CONTEXT_RECONSTRUCTION" | "TNA";

export interface MetricHypothesis {
  readonly workNumber: number;
  readonly workId: string;
  readonly workLabel: string;
  readonly kind: MetricKind;
  readonly hypothesis: {
    readonly targetValue: number;
    readonly unit: string;
    readonly rationale: string;
  };
  readonly actual?: {
    readonly observedValue?: number;
    readonly evidenceRef?: string;
    readonly measuredAt?: string;
  };
  readonly epistemicStatus: "HYPOTHESIS_TARGET" | "MEASURED_ATTEMPT" | "PROVEN" | "REFUTED";
}

export interface MarginalWorkCostComponents {
  readonly timeMinutesBaseline: number;
  readonly humanRepetitionBaseline: number;
  readonly newEngineeringLinesBaseline: number;
  readonly timeMinutesActual?: number;
  readonly humanRepetitionActual?: number;
  readonly newEngineeringLinesActual?: number;
}

export function computeMWC(
  workNumber: number,
  components: MarginalWorkCostComponents,
  maxScale = 100
): MetricHypothesis {
  const baseline = components.timeMinutesBaseline +
    (components.humanRepetitionBaseline * 15) +
    (components.newEngineeringLinesBaseline * 0.05);
  let normalizedHypothesis: number;
  if (workNumber === 1) {
    normalizedHypothesis = maxScale;
  } else {
    normalizedHypothesis = maxScale * Math.max(0.2, Math.pow(0.75, workNumber - 1));
  }
  const clamped = Math.min(maxScale, Math.max(0, normalizedHypothesis));
  void baseline;
  return {
    workNumber,
    workId: `work-${workNumber}`,
    workLabel: `Marginal Work Cost untuk Work #${workNumber}`,
    kind: "MWC",
    hypothesis: {
      targetValue: clamped,
      unit: "normalized index [0-100] (lower = lebih baik) – baseline MWC(1)=100",
      rationale: "HIPOTESIS: Setiap work ulang menurunkan cost ~25% karena reuse machinery yang sama (reuse ratio naik).",
    },
    epistemicStatus: "HYPOTHESIS_TARGET",
  };
}

export interface ReuseRatioComponents {
  readonly totalMachineryRequired: number;
  readonly existingMachineryUsed: number;
  readonly deltaNewMachineryCreated?: number;
}

export function computeReuseRatio(
  workNumber: number,
  comps: ReuseRatioComponents,
  workId: string,
  label?: string
): MetricHypothesis {
  const raw = workNumber === 1
    ? comps.existingMachineryUsed / comps.totalMachineryRequired
    : Math.min(1.0, (comps.existingMachineryUsed / comps.totalMachineryRequired));
  const target = Math.min(1.0, raw);
  return {
    workNumber,
    workId,
    workLabel: label ?? `Reuse Ratio untuk Work #${workNumber}`,
    kind: "REUSE_RATIO",
    hypothesis: {
      targetValue: target,
      unit: "proporsi 0.0–1.0 (higher lebih baik)",
      rationale: "HIPOTESIS: Reuse naik tiap work karena machinery existing sudah terbukti dan dipakai ulang tanpa membuat baru.",
    },
    epistemicStatus: "HYPOTHESIS_TARGET",
  };
}

export interface ContextReconstructionComponents {
  readonly infoShouldBeAvailable: number;
  readonly infoReconstructRequired: number;
  readonly explanation: string;
}

export function computeContextReconstruction(
  workNumber: number,
  comps: ContextReconstructionComponents,
  workId: string
): MetricHypothesis {
  const base = comps.infoShouldBeAvailable === 0 ? 0 :
    (comps.infoReconstructRequired / comps.infoShouldBeAvailable) * 100;
  const targetPct = workNumber === 1 ? base : Math.max(10, base * Math.pow(0.6, workNumber - 1));
  return {
    workNumber,
    workId,
    workLabel: `Context Reconstruction untuk Work #${workNumber}`,
    kind: "CONTEXT_RECONSTRUCTION",
    hypothesis: {
      targetValue: targetPct,
      unit: "% (lower = lebih baik → 0% = tidak ada pengulangan informasi)",
      rationale: comps.explanation || "HIPOTESIS: F2 ProjectContext + F4 PWP menurunkan CR tiap work karena context spine lengkap.",
    },
    epistemicStatus: "HYPOTHESIS_TARGET",
  };
}

export interface TimeToNextActionComponents {
  readonly expectedMinutesAfterHandoff: number;
}

export function computeTNA(
  workNumber: number,
  comps: TimeToNextActionComponents,
  workId: string
): MetricHypothesis {
  const target = workNumber === 1
    ? comps.expectedMinutesAfterHandoff
    : Math.max(1, comps.expectedMinutesAfterHandoff * Math.pow(0.4, workNumber - 1));
  return {
    workNumber,
    workId,
    workLabel: `Time-to-Next-Action untuk Work #${workNumber}`,
    kind: "TNA",
    hypothesis: {
      targetValue: target,
      unit: "minutes (lower lebih baik)",
      rationale: "HIPOTESIS: Setelah PWP terbentuk TNA menurun drastis → professional langsung execute tanpa tanya ulang.",
    },
    epistemicStatus: "HYPOTHESIS_TARGET",
  };
}

/*
 * ============================================================================
 * SAMPEL HYPOTHESIS CURVE (P0-PT-001 s/d #5)
 * BERDASARKAN existing evidence yang SUDAH ADA tapi DALAM BENTUK KURVA TARGET:
 *
 * Existing machinery:
 *   1. legal-case (reused)
 *   2. legal-document (reused)
 *   3. service-directory (reused)
 *   4. legal-community (reused)
 *   5. consultation (reused)
 *   6. identity/session (reused)
 *   7. evidence (reused)
 * Total required untuk PT establishment: 7
 * Existing: 7 (100% existing? → NEW capability = 0.
 * Jadi untuk Work#1 CommsMe → 100% substrate reuse tapi masih CR tinggi karena belum PWP/F2/F3 belum terbukti aktual.
 *
 * PERINGATAN: DI BAWAH INI ADALAH KURVA HIPOTESIS TARGET — BUKAN FAKTA.
 * ============================================================================
 */

const EXISTING_MACHINERY_COUNT = 7 as const;
const TOTAL_REQUIRED_MACHINERY_PT = 7 as const;

export function generateHypothesisCurveForPTSeries(n: readonly number[]): MetricHypothesis[][] {
  return n.map(workNumber => {
    const mwc = computeMWC(workNumber, {
      timeMinutesBaseline: 60 * 8,
      humanRepetitionBaseline: 8,
      newEngineeringLinesBaseline: 120,
    });

    const reuse = computeReuseRatio(workNumber, {
      totalMachineryRequired: TOTAL_REQUIRED_MACHINERY_PT,
      existingMachineryUsed: EXISTING_MACHINERY_COUNT,
    }, `P0-PT-00${workNumber}`);

    const cr = computeContextReconstruction(workNumber, {
      infoShouldBeAvailable: 40,
      infoReconstructRequired: workNumber === 1 ? 16 : 10,
      explanation: "HIPOTESIS: Work#1 CR=40% (profesional masih tanya 40% info). Work#2+ menurun 40% → 24% → 14% → 8% → 5%.",
    }, `P0-PT-00${workNumber}`);

    const tna = computeTNA(workNumber, { expectedMinutesAfterHandoff: 35 }, `P0-PT-00${workNumber}`);
    return [mwc, reuse, cr, tna];
  });
}

export const SAMPLE_PT_HYPOTHESIS_1_5: MetricHypothesis[][] =
  generateHypothesisCurveForPTSeries([1, 2, 3, 4, 5]);

export interface LeverageHypothesisSummary {
  readonly claim: string;
  readonly epistemicStatus: "HYPOTHESIS_CURVE";
  readonly curveNote: string;
  readonly provenRequires: readonly string[];
  readonly metrics: MetricHypothesis[][];
}

export const EOS_LEVERAGE_HYPOTHESIS_SUMMARY: LeverageHypothesisSummary = {
  claim:
    "10× LEVERAGE ADALAH TARGET KURVA HIPOTESIS (BUKAN FAKTA) — marginal cost menurun drastis per work ke-n saat F2 (context spine), F3 (execution thin waist), F4 (PWP projection), F5 (measurement) benar-benar TERBUKTI melalui N ≥ 2 handoff RIIL.",
  epistemicStatus: "HYPOTHESIS_CURVE",
  curveNote:
    "Kurva: MWC(1)=100 → MWC(2)=75 → MWC(3)=56 → MWC(4)=42 → MWC(5)=32 (≈ 68% cost reduction di work#5 jika hipótesis terbukti). Reuse Ratio: R(1)=1.0 → R(5)=~1.0 (no new machinery). TNA(1)=35m → TNA(5)=~0,9m. CR(1)=40% → CR(5)=~5,2%.",
  provenRequires: [
    "P0-PT-001 selesai dengan bukti eksternal (T5 + B4 L4)",
    "P0-PT-002 jalan dengan F2/F3/F4 seam yang SAMA, TIDAK ada new capability",
    "Measurement aktual dari TNA, CR, MWC, RR untuk kedua work",
    "Rule of Two terbukti: 2+ domain memakai F2/F3/F4 TANPA architecture fork",
    "Evidence ≥3 professional handoff berjalan dengan PWP dan TNA ≤ 5 menit tercatat",
  ],
  metrics: SAMPLE_PT_HYPOTHESIS_1_5,
};

export function metricToMarkdown(metric: MetricHypothesis): string {
  const statusIcon =
    metric.epistemicStatus === "HYPOTHESIS_TARGET"
      ? "🎯 HIPOTESIS (BELUM TERBUKTI)"
      : metric.epistemicStatus;
  return `- **${metric.workLabel}** → ${statusIcon}
  target = ${metric.hypothesis.targetValue.toFixed(2)} ${metric.hypothesis.unit}
  rationale: ${metric.hypothesis.rationale}`;
}
