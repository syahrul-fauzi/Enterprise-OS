/*
 * ============================================================================
 * EOS EXPERIMENTAL ARTIFACT — F3: EXECUTION CONTRACT THIN ADAPTER
 * ============================================================================
 * CLASSIFICATION: EXPERIMENT_ONLY (DESIGN INTENTION)
 *
 * TIDAK BOLEH dianggap sebagai framework/engine yang PROVEN.
 *
 * HIPOTESIS (H2-PENDING):
 *   "Apakah 8-field ExecutionContract ini menghilangkan ambiguity pada
 *    boundary execution? — Professional dapat langsung bekerja TANPA
 *    bertanya: 'Jadi sebenarnya saya harus melakukan apa?' (TNA → 0)."
 *
 * Bukti yang dibutuhkan: 3+ professional handoff dengan
 *   Time-to-Next-Action (TNA) ≤ 5 menit terukur.
 * ============================================================================
 */

export const EXECUTION_CONTRACT_CANONICAL_FIELDS = [
  "objective",
  "actor",
  "authority",
  "inputs",
  "action",
  "expectedResponse",
  "evidence",
  "completionCondition",
] as const;

export type ExecutionContractField = typeof EXECUTION_CONTRACT_CANONICAL_FIELDS[number];

export interface ExecutionAuthority {
  readonly roleRequired: string;
  readonly mayDelegate: boolean;
  readonly requiresSigning?: boolean;
  readonly requiresInstitutionalAccess?: boolean;
  readonly boundedBy?: readonly string[];
}

export interface ExecutionInputReference {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly location?: string;
  readonly provided: boolean;
}

export interface ExecutionActionSpec {
  readonly id: string;
  readonly description: string;
  readonly why: string;
  readonly estimatedDurationMinutes?: number;
  readonly estimatedDurationDays?: number | string;
  readonly requiresHumanInTheLoop: boolean;
  readonly requiresExternalSystem: boolean;
}

export interface ExecutionExpectedResponse {
  readonly describe: string;
  readonly acceptanceChecklist: readonly string[];
  readonly failureSignals: readonly string[];
}

export interface ExecutionEvidenceRequirement {
  readonly kind: "artifact" | "signature" | "timestamp" | "external_confirmation" | "state_transition";
  readonly what: string;
  readonly mustBeSignedBy?: string;
  readonly mustHaveExternalTimestamp?: boolean;
}

export interface ExecutionCompletionCondition {
  readonly checklist: readonly string[];
  readonly terminalState: string;
  readonly escalateTo?: string;
  readonly rollbackTrigger?: readonly string[];
}

export interface ExecutionContract {
  readonly contractId: string;
  readonly forBoundary: "ai_to_professional" | "professional_to_external" | "handoff" | "automated_step";
  readonly objective: string;
  readonly actor: {
    readonly id: string;
    readonly role: string;
  };
  readonly authority: ExecutionAuthority;
  readonly inputs: readonly ExecutionInputReference[];
  readonly action: ExecutionActionSpec;
  readonly expectedResponse: ExecutionExpectedResponse;
  readonly evidence: readonly ExecutionEvidenceRequirement[];
  readonly completionCondition: ExecutionCompletionCondition;
  readonly projectionMetadata: {
    readonly projectedAt: string;
    readonly projectedFrom: string;
    readonly version: "F3-EXPERIMENT-v0.1";
  };
}

export function emptyExecutionContract(partial?: Partial<ExecutionContract>): ExecutionContract {
  const now = new Date().toISOString();
  return {
    contractId: partial?.contractId ?? `exec-contract-exp-${Date.now()}`,
    forBoundary: partial?.forBoundary ?? "handoff",
    objective: partial?.objective ?? "",
    actor: partial?.actor ?? { id: "unassigned", role: "Unassigned" },
    authority: partial?.authority ?? { roleRequired: "TBD", mayDelegate: false },
    inputs: partial?.inputs ?? [],
    action: partial?.action ?? {
      id: "unassigned-action",
      description: "",
      why: "",
      requiresHumanInTheLoop: true,
      requiresExternalSystem: false,
    },
    expectedResponse: partial?.expectedResponse ?? {
      describe: "",
      acceptanceChecklist: [],
      failureSignals: [],
    },
    evidence: partial?.evidence ?? [],
    completionCondition: partial?.completionCondition ?? {
      checklist: [],
      terminalState: "pending",
    },
    projectionMetadata: {
      projectedAt: now,
      projectedFrom: partial?.projectionMetadata?.projectedFrom ?? "empty_factory",
      version: "F3-EXPERIMENT-v0.1",
    },
  };
}

/*
 * ============================================================================
 * THIN ADAPTER #1: ProjectContext (F2) + procedure step index → ExecutionContract
 *
 * TIDAK membuat execution engine. Hanya menguji bahwa representation
 * 8-field ini SUFFICIENT untuk menjembatani AI → Professional.
 * ============================================================================
 */
import type { ProjectContext, ContextAction } from "./F2-project-context.contract.js";

export function adaptProjectContextStepToExecutionContract(
  ctx: ProjectContext,
  targetAction: ContextAction | string
): ExecutionContract {
  const action = typeof targetAction === "string"
    ? (ctx.actions.find(a => a.id === targetAction) ?? { id: targetAction, action: targetAction, actor: "unassigned" })
    : targetAction;

  const actorForRole = ctx.actors.find(a =>
    action.actor === "ai" ? a.role.includes("AI") :
    action.actor?.includes("human") ? a.role.includes("Professional") :
    a.role.includes(action.actor ?? "X")
  ) ?? ctx.actors[0] ?? { id: "actor-unknown", role: "Role Not Mapped Yet", responsibility: "", authorityBoundary: [] };

  const requiredInputs = ctx.inputs.filter(i => i.required).map(i => ({
    id: i.id,
    label: i.label,
    required: i.required,
    provided: i.provided,
  }));

  const acceptance: string[] = [];
  acceptance.push(`Objective tercapai: ${action.action}`);
  acceptance.push("Semua checklist inputs ter-provide ATAU secara eksplisit dinyatakan TIDAK DIBUTUHKAN oleh professional");
  acceptance.push("Evidence minimal 1 artifact sesuai specification");

  return {
    contractId: `exec-${ctx.contextId}-${action.id}-${Date.now()}`,
    forBoundary: action.requiresExternal ? "professional_to_external" : action.requiresHuman ? "ai_to_professional" : "automated_step",
    objective: `[${action.id}] ${action.action} — untuk: ${ctx.intent.slice(0, 120)}${ctx.intent.length > 120 ? "…" : ""}`,
    actor: { id: actorForRole.id, role: actorForRole.role },
    authority: {
      roleRequired: actorForRole.role,
      mayDelegate: !ctx.authority.humanProfessionalRequired || (action.requiresHuman !== true),
      requiresSigning: ctx.authority.humanProfessionalRequired,
      requiresInstitutionalAccess: action.requiresExternal === true,
      boundedBy: actorForRole.authorityBoundary.length > 0 ? actorForRole.authorityBoundary : undefined,
    },
    inputs: requiredInputs,
    action: {
      id: action.id,
      description: action.action,
      why: `Authority boundary: ${ctx.authority.humanProfessionalRequired ? "MANUSIA DIBUTUHKAN (legal req)" : "Dapat dijalankan oleh AI/System"}. External institutions: ${ctx.authority.externalInstitutionRequired ? "YES" : "NO"}.`,
      estimatedDurationMinutes: action.requiresExternal ? undefined : 60,
      estimatedDurationDays: action.requiresExternal ? "1-7 hari kerja" : undefined,
      requiresHumanInTheLoop: action.requiresHuman === true,
      requiresExternalSystem: action.requiresExternal === true,
    },
    expectedResponse: {
      describe: `Professional ${actorForRole.role} menjalankan aksi dan mengembalikan hasil verifikasi checklist berikut.`,
      acceptanceChecklist: acceptance,
      failureSignals: [
        "Inputs required ditandai 'provided=false' TANPA penjelasan",
        "Ada new pending question yang SEHARUSNYA sudah ada di ProjectContext.pendingQuestions (indikasi context hilang)",
        "Professional meminta pengulangan informasi dasar (nama PT, alamat, pendiri) → Context Reconstruction tinggi",
      ],
    },
    evidence: [
      { kind: "state_transition", what: `Work state: ${ctx.state} → executing → complete_pending` },
      ...(action.requiresHuman
        ? [{ kind: "signature" as const, what: "Tanda tangan digital / verifikasi identity professional", mustBeSignedBy: actorForRole.id }]
        : []),
      ...(action.requiresExternal
        ? [{ kind: "external_confirmation" as const, what: "Bukti timestamp external (nomor registrasi / SK / receipt)", mustHaveExternalTimestamp: true }]
        : []),
    ],
    completionCondition: {
      checklist: [
        ...acceptance,
        "Evidence item paling tidak 1 tersedia",
        "Tidak ada failure signal yang aktif",
      ],
      terminalState: "execution_passed_pending_verification",
      escalateTo: ctx.actors.find(a => a.role.includes("Professional"))?.id,
      rollbackTrigger: [
        "External institution rejection",
        "Failure signal #3 aktif (repetisi informasi dasar = context loss)",
      ],
    },
    projectionMetadata: {
      projectedAt: new Date().toISOString(),
      projectedFrom: `F2-ProjectContext:${ctx.contextId} × Action:${action.id}`,
      version: "F3-EXPERIMENT-v0.1",
    },
  };
}

/*
 * ============================================================================
 * ADAPTER #2: Dari WorkSeed procedure step langsung (shortcut path agar
 * F3 bisa test tanpa F2 terlebih dahulu).
 * ============================================================================
 */
import type { ProjectableWorkSeed } from "./F2-project-context.contract.js";

export function adaptWorkSeedStepToExecutionContract(
  seed: ProjectableWorkSeed,
  stepIndex: number
): ExecutionContract {
  const step = (seed.procedure ?? [])[stepIndex];
  if (!step) throw new Error(`adaptWorkSeedStepToExecutionContract: step index ${stepIndex} tidak ada di workseed.procedure`);

  const isHuman = String(step.actor ?? "").includes("human");
  const isExt = String(step.actor ?? "").includes("external");
  const role = isHuman ? "Notaris / Profesional Legal Pendamping UMKM"
    : isExt ? "Profesional + Sistem Institusi Pemerintah (Kemenkumham/OSS/DJP)"
    : step.actor === "ai" ? "AI Assistant EOS" : step.actor ?? "Unassigned";

  return {
    contractId: `exec-contract-${seed.workSeedId ?? "unknown"}-step${step.step}-${Date.now()}`,
    forBoundary: isExt ? "professional_to_external" : isHuman ? "ai_to_professional" : "automated_step",
    objective: step.title ?? `Procedure Step ${step.step}`,
    actor: {
      id: isHuman ? "actor-notaris-umkm" : isExt ? "actor-ext-institution" : "actor-ai-eos",
      role,
    },
    authority: {
      roleRequired: role,
      mayDelegate: !isHuman,
      requiresSigning: isHuman,
      requiresInstitutionalAccess: isExt,
      boundedBy: (step.exitCriteria ?? []).length > 0 ? step.exitCriteria : undefined,
    },
    inputs: (seed.requiredInputs ?? []).map(i => ({
      id: i.id,
      label: i.label,
      required: i.required,
      provided: Boolean(i.example),
    })),
    action: {
      id: step.id ?? `proc-step-${step.step}`,
      description: step.title ?? `Step ${step.step}`,
      why: step.exitCriteria?.join("; ") ?? "Exit criteria tercapai",
      estimatedDurationMinutes: typeof step.durationEstimateMinutes === "number" ? step.durationEstimateMinutes : undefined,
      estimatedDurationDays: step.durationEstimateDays,
      requiresHumanInTheLoop: isHuman,
      requiresExternalSystem: isExt,
    },
    expectedResponse: {
      describe: step.exitCriteria
        ? `Professional menjalankan aksi dan memverifikasi ${step.exitCriteria.length} exit criteria berikut.`
        : "Hasil aksi tersedia",
      acceptanceChecklist: [
        ...(step.exitCriteria ?? [`Step ${step.step} selesai`]),
        "Tidak ada informasi dasar user yang di-RE-ASK (nama PT, alamat, pendiri) — context retention 100%",
      ],
      failureSignals: [
        "Professional bertanya 'Jadi mau didirikan apa?' (context hilang total)",
        "Diminta ulang KTP / nama PT / alamat domisili (repetisi = high CR)",
        "Tidak ada bukti evidence sama sekali",
      ],
    },
    evidence: [
      { kind: "state_transition", what: `Procedure step ${step.step} marked DONE` },
      ...(isHuman ? [{ kind: "signature" as const, what: "Verifikasi identity professional (tanda tangan / login)", mustBeSignedBy: "professional" }] : []),
      ...(isExt ? [{ kind: "external_confirmation" as const, what: "Bukti timestamp dari sistem pemerintah (AHU/OSS/DJP)", mustHaveExternalTimestamp: true }] : []),
    ],
    completionCondition: {
      checklist: [
        ...(step.exitCriteria ?? [`Step ${step.step} complete`]),
        "Tidak ada failure signal",
      ],
      terminalState: `step_${step.step}_passed`,
    },
    projectionMetadata: {
      projectedAt: new Date().toISOString(),
      projectedFrom: `WorkSeed:${seed.workSeedId ?? "unknown"}.procedure[${stepIndex}]`,
      version: "F3-EXPERIMENT-v0.1",
    },
  };
}

/*
 * ============================================================================
 * SAMPEL: ExecutionContract untuk P0-PT-001 STEP 3 (HUMAN BOUNDARY NOTARIS)
 * Ini adalah use case PALING KRITIS untuk membuktikan H2 (TNA → 0).
 * ============================================================================
 */
import { SAMPLE_P0_PT_001_SEED } from "./F2-project-context.contract.js";
export const SAMPLE_P0_PT_001_STEP3_CONTRACT: ExecutionContract =
  adaptWorkSeedStepToExecutionContract(SAMPLE_P0_PT_001_SEED, 2);
