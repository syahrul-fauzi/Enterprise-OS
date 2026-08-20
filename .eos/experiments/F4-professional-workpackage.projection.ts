/*
 * ============================================================================
 * EOS EXPERIMENTAL ARTIFACT — F4: PROFESSIONAL WORK PACKAGE PROJECTION
 * ============================================================================
 * CLASSIFICATION: EXPERIMENT_ONLY (DESIGN INTENTION)
 *
 * BUKAN: dashboard, workflow engine, capability baru, registry baru,
 *       platform baru.
 *
 * HANYA: PROJECTION (read-only pure shaping) dari:
 *   F2 ProjectContext + F3 ExecutionContract
 *     ↓
 *   12-field Professional Work Package
 *
 * HIPOTESIS (H3-PENDING):
 *   "Projection ini mengurangi Context Reconstruction (CR) work untuk
 *    professional. Jika profesional butuh <10 menit + 0 pertanyaan ulang
 *    informasi dasar untuk memulai aksi, primitive ini CANDIDATE untuk
 *    dijadikan shared (Rule of Two — butuh minimal work #2 untuk membuktikan)."
 *
 * Bukti yang dibutuhkan: 3+ work dengan CR ≤ 20% dan TNA ≤ 5 menit.
 * ============================================================================
 */

export const PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS = [
  "who",
  "what",
  "why",
  "knownFacts",
  "missingFacts",
  "documents",
  "decisions",
  "requestedAction",
  "authority",
  "deadline",
  "expectedOutput",
  "evidence",
] as const;

export type PWPField = typeof PROFESSIONAL_WORK_PACKAGE_CANONICAL_FIELDS[number];

export interface WhoIs {
  readonly professionalId: string;
  readonly nameDisplay: string;
  readonly role: string;
  readonly specialization?: string;
  readonly contactHint?: string;
}

export interface WhatIsThisWork {
  readonly workId: string;
  readonly title: string;
  readonly oneLiner: string;
  readonly domain: string;
  readonly originatedFrom: string;
}

export interface WhyItMatters {
  readonly userOutcome: readonly string[];
  readonly businessRationale: string;
  readonly failureModesWatchlist: readonly string[];
}

export interface KnownFact {
  readonly label: string;
  readonly value: unknown;
  readonly epistemicStatus: "CLAIMED" | "OBSERVED" | "EVIDENCED" | "VERIFIED" | "PENDING";
  readonly verifiedBy?: string;
  readonly lastUpdatedAt?: string;
}

export interface MissingFact {
  readonly id: string;
  readonly label: string;
  readonly whyMissingIsOk?: string;
  readonly criticalPath: boolean;
  readonly responsibleToCollect: "professional" | "ai" | "user" | "external";
}

export interface DocumentReference {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly status: "draft" | "pending_signature" | "signed" | "external_issued" | "expected";
  readonly locationHint: string;
  readonly integritySha?: string;
}

export interface DecisionRecordPWP {
  readonly id: string;
  readonly title: string;
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly context?: string;
  readonly revocable?: boolean;
}

export interface RequestedActionItem {
  readonly actionNumber: number;
  readonly action: string;
  readonly objective: string;
  readonly boundary: "inside_eos" | "professional_only" | "external_institution";
  readonly requiresSignature: boolean;
  readonly requiresExternalSubmission: boolean;
}

export interface AuthorityBoundary {
  readonly maySign: boolean;
  readonly maySubmitToExternal: boolean;
  readonly mayDecideFinal: boolean;
  readonly escalationTo: string;
  readonly decisionMakerName: string;
}

export interface ExpectedOutputItem {
  readonly item: string;
  readonly formatHint: string;
  readonly recipient: string;
  readonly handoffBackTo: "eos_system" | "user" | "next_professional";
}

export interface EvidenceRequirementPWP {
  readonly what: string;
  readonly kind: "document" | "signature" | "external_receipt" | "email" | "whatsapp" | "timestamp";
  readonly mustExist: boolean;
  readonly notes?: string;
}

export interface ProfessionalWorkPackage {
  readonly packageId: string;
  readonly generatedAt: string;
  readonly who: WhoIs;
  readonly what: WhatIsThisWork;
  readonly why: WhyItMatters;
  readonly knownFacts: readonly KnownFact[];
  readonly missingFacts: readonly MissingFact[];
  readonly documents: readonly DocumentReference[];
  readonly decisions: readonly DecisionRecordPWP[];
  readonly requestedAction: readonly RequestedActionItem[];
  readonly authority: AuthorityBoundary;
  readonly deadline: {
    readonly softDeadlineBusinessDays?: number;
    readonly softDeadlineAt?: string;
    readonly hardRegulatoryDeadline?: string;
    readonly priority: "low" | "medium" | "high" | "critical";
  };
  readonly expectedOutput: readonly ExpectedOutputItem[];
  readonly evidence: readonly EvidenceRequirementPWP[];
  readonly projectionMetadata: {
    readonly projectedFrom: string;
    readonly version: "F4-EXPERIMENT-v0.1";
    readonly contextLink?: string;
    readonly executionContractLink?: string;
  };
}

/*
 * ============================================================================
 * PURE PROJECTOR: (F2 ProjectContext, F3 ExecutionContract) → PWP
 *
 * TIDAK ada side effect. TIDAK ada I/O. Hanya data shaping.
 * Ini = thin waist pattern untuk handoff projection.
 * ============================================================================
 */
import type { ProjectContext, ContextFact } from "./F2-project-context.contract.js";
import type { ExecutionContract } from "./F3-execution-contract.adapter.js";

export function projectProfessionalWorkPackage(
  ctx: ProjectContext,
  exec: ExecutionContract
): ProfessionalWorkPackage {
  const whoActor = exec.actor;
  const whoRole = ctx.actors.find(a => a.id === whoActor.id)?.role ?? whoActor.role;

  const knownFacts: KnownFact[] = ctx.facts.map((f: ContextFact) => ({
    label: f.key,
    value: f.value,
    epistemicStatus: f.epistemicStatus as KnownFact["epistemicStatus"],
    verifiedBy: f.recordedBy,
    lastUpdatedAt: f.recordedAt,
  }));

  ctx.inputs.forEach(i => {
    if (i.provided && i.value !== undefined) {
      knownFacts.push({
        label: i.label,
        value: i.value,
        epistemicStatus: "OBSERVED",
        lastUpdatedAt: ctx.projectionMetadata.projectedAt,
      });
    }
  });

  const missingFacts: MissingFact[] = [
    ...ctx.inputs.filter(i => i.required && !i.provided).map(i => ({
      id: i.id,
      label: `${i.label} (input ${i.type})`,
      criticalPath: true,
      responsibleToCollect: "user" as const,
    })),
    ...ctx.pendingQuestions.map((q, i) => ({
      id: `pq-${i}-${ctx.contextId}`,
      label: q,
      criticalPath: q.startsWith("MISSING_INPUT"),
      responsibleToCollect: "professional" as const,
    })),
  ];

  const documents: DocumentReference[] = ctx.artifacts.map(a => ({
    id: a.id,
    name: a.title,
    kind: a.kind,
    status: (a.epistemicStatus === "VERIFIED" ? "signed"
      : a.epistemicStatus === "EVIDENCED" ? "external_issued"
      : "draft") as DocumentReference["status"],
    locationHint: a.location,
    integritySha: a.integrity,
  }));

  if (ctx.workType.includes("company_establishment") || ctx.workType.includes("PT")) {
    documents.push(
      { id: "doc-akta-expected", name: "Akta Pendirian PT (draf awal)", kind: "corporate-deed", status: "draft", locationHint: "Generated from proc.2.ai_document_draft" },
      { id: "doc-sk-kemenkumham-expected", name: "SK Kemenkumham", kind: "government_document", status: "expected", locationHint: "Expected dari ext.2" },
      { id: "doc-nib-oss-expected", name: "NIB OSS RBA", kind: "government_document", status: "expected", locationHint: "Expected dari ext.3" },
      { id: "doc-npwp-expected", name: "NPWP Badan Usaha", kind: "government_document", status: "expected", locationHint: "Expected dari ext.4" },
    );
  }

  const decisions: DecisionRecordPWP[] = ctx.decisions.map(d => ({
    id: d.id,
    title: d.decision,
    decidedBy: d.by,
    decidedAt: d.at,
    context: d.rationale,
    revocable: d.revocable,
  }));

  const requestedAction: RequestedActionItem[] = exec.completionCondition.checklist.map((_, i) => {
    const boundary = exec.forBoundary === "professional_to_external" ? "external_institution"
      : exec.forBoundary === "ai_to_professional" ? "professional_only" : "inside_eos";
    return {
      actionNumber: i + 1,
      action: exec.completionCondition.checklist[i] ?? exec.action.description,
      objective: exec.objective,
      boundary,
      requiresSignature: exec.authority.requiresSigning === true,
      requiresExternalSubmission: exec.authority.requiresInstitutionalAccess === true,
    };
  });

  const expectedOutput: ExpectedOutputItem[] = exec.expectedResponse.acceptanceChecklist.map(ac => ({
    item: ac,
    formatHint: "Evidence: document/signature/external receipt",
    recipient: "EOS Evidence Registry",
    handoffBackTo: "eos_system" as const,
  }));

  const evidence: EvidenceRequirementPWP[] = exec.evidence.map(e => ({
    what: e.what,
    kind: (e.kind === "signature" ? "signature"
      : e.kind === "external_confirmation" ? "external_receipt"
      : e.kind === "artifact" ? "document" : "timestamp") as EvidenceRequirementPWP["kind"],
    mustExist: true,
    notes: e.mustBeSignedBy ? `Signed by: ${e.mustBeSignedBy}` : undefined,
  }));

  const priority: ProfessionalWorkPackage["deadline"]["priority"] =
    exec.authority.requiresInstitutionalAccess ? "critical" :
    exec.authority.requiresSigning ? "high" : "medium";

  return {
    packageId: `pwp-${ctx.contextId}-${exec.contractId}`,
    generatedAt: new Date().toISOString(),
    who: {
      professionalId: whoActor.id,
      nameDisplay: whoRole,
      role: whoRole,
      specialization: ctx.workType,
    },
    what: {
      workId: ctx.contextId,
      title: ctx.intent.slice(0, 80) || exec.objective.slice(0, 80),
      oneLiner: exec.objective,
      domain: ctx.workType,
      originatedFrom: ctx.createdFromBoundary === "work_item" ? `WorkSeed: ${ctx.projectionMetadata.projectedFrom}` : "Conversation",
    },
    why: {
      userOutcome: ctx.desiredOutcome,
      businessRationale: `EOS work type=${ctx.workType}. Authority human=${ctx.authority.humanProfessionalRequired}, external=${ctx.authority.externalInstitutionRequired}.`,
      failureModesWatchlist: ctx.constraints.filter(c => c.startsWith("FAILURE_MODE_WATCH:")).map(c => c.replace("FAILURE_MODE_WATCH: ", "")),
    },
    knownFacts,
    missingFacts,
    documents,
    decisions,
    requestedAction,
    authority: {
      maySign: exec.authority.requiresSigning === true,
      maySubmitToExternal: exec.authority.requiresInstitutionalAccess === true,
      mayDecideFinal: exec.forBoundary !== "ai_to_professional",
      escalationTo: exec.completionCondition.escalateTo ?? "operator-pt-establishment-007",
      decisionMakerName: ctx.authority.decisionMaker,
    },
    deadline: {
      softDeadlineBusinessDays: priority === "critical" ? 14 : priority === "high" ? 7 : undefined,
      priority,
    },
    expectedOutput,
    evidence,
    projectionMetadata: {
      projectedFrom: `F2:${ctx.contextId} × F3:${exec.contractId}`,
      version: "F4-EXPERIMENT-v0.1",
      contextLink: ctx.contextId,
      executionContractLink: exec.contractId,
    },
  };
}

/*
 * ============================================================================
 * SAMPEL: P0-PT-001 Professional Work Package untuk NOTARIS (STEP 3)
 *
 * Paket ini = APA yang akan diterima notaris ketika handoff (bukan
 * dashboard, bukan app baru — projection murni yang akan di-render oleh
 * surface apapun — email, chat, PDF, dashboard — SESUAI kebutuhan).
 * ============================================================================
 */
import {
  SAMPLE_P0_PT_001_CONTEXT,
  SAMPLE_P0_PT_001_SEED,
} from "./F2-project-context.contract.js";
import { adaptProjectContextStepToExecutionContract } from "./F3-execution-contract.adapter.js";

const STEP3_ACTION = SAMPLE_P0_PT_001_CONTEXT.actions.find(a => a.id === "proc.3.human_boundary_notary_handoff")
  ?? SAMPLE_P0_PT_001_CONTEXT.actions[2];

export const SAMPLE_P0_PT_001_NOTARY_PWP: ProfessionalWorkPackage = projectProfessionalWorkPackage(
  SAMPLE_P0_PT_001_CONTEXT,
  adaptProjectContextStepToExecutionContract(SAMPLE_P0_PT_001_CONTEXT, STEP3_ACTION)
);
