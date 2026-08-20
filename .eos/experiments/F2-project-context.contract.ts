/*
 * ============================================================================
 * EOS EXPERIMENTAL ARTIFACT — F2: PROJECT CONTEXT KNOWLEDGE CONTRACT
 * ============================================================================
 * CLASSIFICATION: EXPERIMENT_ONLY (DESIGN INTENTION)
 *
 * TIDAK BOLEH dianggap sebagai:
 *   - PROVEN capability
 *   - PROVEN primitive
 *   - Production-ready service/engine
 *
 * HANYA digunakan untuk:
 *   - menguji HIPOTESIS: "Apakah 14-field representation ini membuat context
 *     dapat dipindahkan dari satu boundary ke boundary berikutnya tanpa
 *     reconstruction 70%+?"
 *
 * Status hipotesis: BELUM TERBUKTI (H1-PENDING)
 * Bukti yang dibutuhkan: 3+ handoff lintas actor (AI → Professional → External)
 *                       dengan Context Reconstruction (CR) ≤ 20% terukur.
 * ============================================================================
 */

export type ProjectContextField =
  | "intent"
  | "desiredOutcome"
  | "actors"
  | "facts"
  | "constraints"
  | "inputs"
  | "artifacts"
  | "decisions"
  | "actions"
  | "state"
  | "pendingQuestions"
  | "authority"
  | "externalReferences"
  | "evidence";

export const PROJECT_CONTEXT_CANONICAL_FIELDS: readonly ProjectContextField[] = [
  "intent",
  "desiredOutcome",
  "actors",
  "facts",
  "constraints",
  "inputs",
  "artifacts",
  "decisions",
  "actions",
  "state",
  "pendingQuestions",
  "authority",
  "externalReferences",
  "evidence",
] as const;

export type EpistemicTag = "CLAIMED" | "OBSERVED" | "EVIDENCED" | "VERIFIED" | "PENDING";

export interface ContextFact {
  readonly key: string;
  readonly value: unknown;
  readonly epistemicStatus: EpistemicTag;
  readonly recordedAt: string;
  readonly recordedBy: string;
  readonly sourceBoundary?: "conversation" | "ai" | "professional" | "external";
}

export interface ContextActor {
  readonly id: string;
  readonly role: string;
  readonly responsibility: string;
  readonly authorityBoundary: readonly string[];
  readonly contactHint?: string;
}

export interface ContextArtifact {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly location: string;
  readonly integrity?: string;
  readonly epistemicStatus: EpistemicTag;
}

export interface ContextDecision {
  readonly id: string;
  readonly decision: string;
  readonly rationale: string;
  readonly by: string;
  readonly at: string;
  readonly revocable?: boolean;
}

export interface ContextAction {
  readonly id: string;
  readonly action: string;
  readonly actor: string;
  readonly scheduledAt?: string;
  readonly completedAt?: string;
  readonly result?: string;
  readonly requiresHuman?: boolean;
  readonly requiresExternal?: boolean;
}

export interface ContextExternalReference {
  readonly kind: "regulation" | "vendor_system" | "institution" | "template";
  readonly id: string;
  readonly title: string;
  readonly reference?: string;
}

export interface ContextEvidenceItem {
  readonly action: string;
  readonly stage: string;
  readonly entityType: string;
  readonly observedAt?: string;
  readonly externalConfirmationRequired?: boolean;
}

export interface ProjectContext {
  readonly contextId: string;
  readonly workType: string;
  readonly createdFromBoundary: "conversation" | "work_item" | "handoff";
  readonly intent: string;
  readonly desiredOutcome: readonly string[];
  readonly actors: readonly ContextActor[];
  readonly facts: readonly ContextFact[];
  readonly constraints: readonly string[];
  readonly inputs: readonly {
    readonly id: string;
    readonly label: string;
    readonly type: string;
    readonly required: boolean;
    readonly provided: boolean;
    readonly value?: unknown;
  }[];
  readonly artifacts: readonly ContextArtifact[];
  readonly decisions: readonly ContextDecision[];
  readonly actions: readonly ContextAction[];
  readonly state: string;
  readonly pendingQuestions: readonly string[];
  readonly authority: {
    readonly decisionMaker: string;
    readonly approver?: string;
    readonly humanProfessionalRequired: boolean;
    readonly externalInstitutionRequired: boolean;
  };
  readonly externalReferences: readonly ContextExternalReference[];
  readonly evidence: readonly ContextEvidenceItem[];
  readonly projectionMetadata: {
    readonly projectedAt: string;
    readonly projectedFrom: string;
    readonly version: "F2-EXPERIMENT-v0.1";
  };
}

export function emptyProjectContext(partial?: Partial<ProjectContext>): ProjectContext {
  const now = new Date().toISOString();
  return {
    contextId: partial?.contextId ?? `ctx-experiment-${Date.now()}`,
    workType: partial?.workType ?? "unknown",
    createdFromBoundary: partial?.createdFromBoundary ?? "conversation",
    intent: partial?.intent ?? "",
    desiredOutcome: partial?.desiredOutcome ?? [],
    actors: partial?.actors ?? [],
    facts: partial?.facts ?? [],
    constraints: partial?.constraints ?? [],
    inputs: partial?.inputs ?? [],
    artifacts: partial?.artifacts ?? [],
    decisions: partial?.decisions ?? [],
    actions: partial?.actions ?? [],
    state: partial?.state ?? "created",
    pendingQuestions: partial?.pendingQuestions ?? [],
    authority: partial?.authority ?? {
      decisionMaker: "unassigned",
      humanProfessionalRequired: false,
      externalInstitutionRequired: false,
    },
    externalReferences: partial?.externalReferences ?? [],
    evidence: partial?.evidence ?? [],
    projectionMetadata: {
      projectedAt: now,
      projectedFrom: partial?.projectionMetadata?.projectedFrom ?? "empty_factory",
      version: "F2-EXPERIMENT-v0.1",
    },
  };
}

/*
 * ============================================================================
 * PROJECTION: ProjectContext dari WorkSeed JSON (P0-PT-001 contoh)
 *
 * INI BUKAN ENGINE.
 * Ini = pure function SHAPING, untuk menguji apakah 14-field contract
 * SUFFICIENT untuk merepresentasikan state knowledge suatu work.
 * ============================================================================
 */
export type ProjectableWorkSeed = {
  readonly workSeedId?: string;
  readonly product?: string;
  readonly need?: { readonly title?: string; readonly summary?: string; readonly userStory?: string; readonly domain?: string };
  readonly outcome?: { readonly successCriteria?: readonly string[]; readonly failureModes?: readonly string[] };
  readonly context?: {
    readonly preconditions?: readonly string[];
    readonly assumptions?: readonly string[];
    readonly regulatoryReferences?: readonly string[];
  };
  readonly requiredInputs?: readonly {
    readonly id: string;
    readonly label: string;
    readonly type: string;
    readonly required: boolean;
    readonly example?: unknown;
  }[];
  readonly procedure?: readonly {
    readonly step: number;
    readonly id?: string;
    readonly title?: string;
    readonly actor?: string;
    readonly durationEstimateMinutes?: number;
    readonly durationEstimateDays?: number | string;
    readonly exitCriteria?: readonly string[];
  }[];
  readonly humanBoundary?: {
    readonly nonDelegableToAI?: readonly string[];
    readonly contextRetentionGuarantee?: { readonly guarantee?: string; readonly mechanism?: string };
  };
  readonly externalActions?: readonly { readonly id?: string; readonly description?: string; readonly externalParty?: string }[];
  readonly evidence?: { readonly ledgerActions?: readonly { readonly action: string; readonly stage: string; readonly entityType: string }[] };
  readonly kpi?: {
    readonly targetTimeToFirstOutcomeBusinessDays?: number;
    readonly targetHandoffContextRetentionPercent?: number;
    readonly targetRealWorkCompletionRatePercent?: number;
    readonly targetHumanRepetitionRatePercent?: number;
  };
};

export function projectContextFromWorkSeed(seed: ProjectableWorkSeed): ProjectContext {
  const now = new Date().toISOString();
  const actors: ContextActor[] = [];

  if (seed.procedure) {
    for (const step of seed.procedure) {
      const role = step.actor === "human_professional" ? "Professional (Notaris/Penyedia Jasa)"
        : step.actor === "external_system + human_professional" ? "External Institution + Professional"
        : step.actor === "human_professional + ai" ? "Professional + AI Assistant"
        : step.actor === "ai" ? "AI Assistant" : step.actor ?? "Unassigned";
      if (!actors.some(a => a.role === role)) {
        actors.push({
          id: `actor-${step.actor ?? step.step}`,
          role,
          responsibility: step.title ?? `Procedure step ${step.step}`,
          authorityBoundary: step.exitCriteria ? [...step.exitCriteria] : [],
        });
      }
    }
  }

  if (seed.humanBoundary?.nonDelegableToAI && seed.humanBoundary.nonDelegableToAI.length > 0) {
    if (!actors.some(a => a.role.includes("Professional"))) {
      actors.unshift({
        id: "actor-human-professional",
        role: "Human Professional (Notaris / Legal)",
        responsibility: "Non-delegable actions requiring legal authority",
        authorityBoundary: [...seed.humanBoundary.nonDelegableToAI],
      });
    }
  }

  const facts: ContextFact[] = [];
  if (seed.need?.domain) {
    facts.push({ key: "business.domain", value: seed.need.domain, epistemicStatus: "CLAIMED", recordedAt: now, recordedBy: "workseed.projection", sourceBoundary: "conversation" });
  }
  if (seed.need?.title) {
    facts.push({ key: "need.title", value: seed.need.title, epistemicStatus: "CLAIMED", recordedAt: now, recordedBy: "workseed.projection", sourceBoundary: "conversation" });
  }
  if (seed.kpi?.targetHandoffContextRetentionPercent !== undefined) {
    facts.push({
      key: "kpi.target_context_retention_pct",
      value: seed.kpi.targetHandoffContextRetentionPercent,
      epistemicStatus: "OBSERVED",
      recordedAt: now,
      recordedBy: "workseed.projection",
    });
  }

  const inputs = (seed.requiredInputs ?? []).map(i => ({
    id: i.id,
    label: i.label,
    type: i.type,
    required: i.required,
    provided: false,
    value: i.example,
  }));

  const actions: ContextAction[] = (seed.procedure ?? []).map(step => ({
    id: step.id ?? `proc-step-${step.step}`,
    action: step.title ?? `Step ${step.step}`,
    actor: step.actor ?? "unassigned",
    requiresHuman: step.actor?.includes("human") ?? false,
    requiresExternal: step.actor?.includes("external") ?? false,
  }));

  const externalRefs: ContextExternalReference[] = (seed.context?.regulatoryReferences ?? []).map((ref, i) => ({
    kind: "regulation" as const,
    id: `reg-${i}`,
    title: ref,
  }));
  (seed.externalActions ?? []).forEach((ea, i) => {
    if (ea.externalParty) {
      externalRefs.push({
        kind: "institution" as const,
        id: `ext-${ea.id ?? i}`,
        title: ea.externalParty,
        reference: ea.description,
      });
    }
  });

  return {
    contextId: `ctx-${seed.workSeedId ?? "workseed"}-${Date.now()}`,
    workType: seed.need?.domain ?? seed.product ?? "unknown",
    createdFromBoundary: "work_item",
    intent: [seed.need?.summary, seed.need?.userStory].filter(Boolean).join(" | ") || seed.need?.title || "",
    desiredOutcome: [...(seed.outcome?.successCriteria ?? [])],
    actors,
    facts,
    constraints: [
      ...(seed.context?.preconditions ?? []).map(p => `PRECONDITION: ${p}`),
      ...(seed.context?.assumptions ?? []).map(a => `ASSUMPTION: ${a}`),
      ...(seed.outcome?.failureModes ?? []).map(f => `FAILURE_MODE_WATCH: ${f}`),
      ...(seed.humanBoundary?.nonDelegableToAI ?? []).map(n => `HUMAN_REQUIRED: ${n}`),
    ],
    inputs,
    artifacts: [],
    decisions: [],
    actions,
    state: "intent_captured",
    pendingQuestions: (seed.requiredInputs ?? []).filter(i => i.required && !i.example).map(i => `MISSING_INPUT: ${i.label} (${i.id})`),
    authority: {
      decisionMaker: actors[0]?.id ?? "unassigned",
      approver: actors.find(a => a.role.includes("Professional"))?.id,
      humanProfessionalRequired: (seed.humanBoundary?.nonDelegableToAI?.length ?? 0) > 0,
      externalInstitutionRequired: (seed.externalActions?.length ?? 0) > 0,
    },
    externalReferences: externalRefs,
    evidence: (seed.evidence?.ledgerActions ?? []).map(ea => ({
      action: ea.action,
      stage: ea.stage,
      entityType: ea.entityType,
    })),
    projectionMetadata: {
      projectedAt: now,
      projectedFrom: seed.workSeedId ?? "anonymous_workseed",
      version: "F2-EXPERIMENT-v0.1",
    },
  };
}

/*
 * ============================================================================
 * SAMPEL: P0-PT-001 ProjectContext (dari pt-establishment.workseed.json)
 *
 * Digunakan untuk F4 ProfessionalWorkPackage projector dan F5 metric
 * calculation. INI BUKAN runtime state. INI = CONTOH projection yang
 * menargetkan jawaban: "14 field cukup atau kurang?"
 * ============================================================================
 */
export const SAMPLE_P0_PT_001_SEED: ProjectableWorkSeed = {
  workSeedId: "WORKSEED-PT-ESTABLISHMENT-UMKM-001",
  product: "commsme",
  need: {
    title: "Pendirian PT untuk UMKM",
    summary: "Pelaku UMKM membutuhkan pendirian PT atau CV untuk legalitas usaha.",
    userStory: "Sebagai pemilik UMKM, saya ingin mendirikan PT agar usaha berbadan hukum resmi.",
    domain: "legal.company_establishment",
  },
  outcome: {
    successCriteria: [
      "Akta Pendirian PT tertandatangani Notaris",
      "NIB terbit OSS RBA",
      "NPWP Badan terdaftar DJP",
      "SK Kemenkumham terbit",
      "Semua dokumen tersimpan Evidence Registry",
      "Konteks handoff 100% lengkap: pengguna tidak perlu mengulang cerita",
    ],
    failureModes: [
      "Nama PT bentrok Kemenkumham → butuh 3 opsi cadangan",
      "Alamat domisili tidak sesuai → butuh surat keterangan domisili",
      "Modal awal tidak cukup minimum → perlu penyesuaian permodalan",
    ],
  },
  context: {
    preconditions: [
      "Pengguna WNI atau badan hukum Indonesia",
      "Minimal 1 opsi nama PT (sebaiknya 3)",
      "Alamat domisili usaha dapat diverifikasi",
    ],
    assumptions: [
      "PT Perorangan (UMKM 1 pendiri) atau PT standar (2+)",
      "Modal dasar minimum UU No.40/2007",
    ],
    regulatoryReferences: [
      "UU No.40 Tahun 2007 tentang Perseroan Terbatas",
      "UU No.11 Tahun 2020 tentang Cipta Kerja",
      "Peraturan Kemenkumham Pendaftaran PT elektronik",
      "Peraturan OSS RBA tentang NIB",
    ],
  },
  requiredInputs: [
    { id: "input.business_field", label: "Bidang Usaha", type: "select", required: true },
    { id: "input.pt_name_options", label: "3 Opsi Nama PT", type: "text_multiline", required: true },
    { id: "input.address_domicile", label: "Alamat Domisili PT", type: "text", required: true },
    { id: "input.founders", label: "Data Pendiri", type: "json_object", required: true },
    { id: "input.capital_structure", label: "Struktur Permodalan", type: "json_object", required: true },
    { id: "input.business_license_needed", label: "Izin Usaha Tambahan", type: "multiselect", required: false },
  ],
  procedure: [
    { step: 1, id: "proc.1.context_collection", title: "Kumpulkan Konteks & Validasi Input", actor: "ai", durationEstimateMinutes: 15 },
    { step: 2, id: "proc.2.ai_document_draft", title: "Buat Draf Dokumen Pendirian", actor: "ai", durationEstimateMinutes: 20 },
    { step: 3, id: "proc.3.human_boundary_notary_handoff", title: "Handoff ke Notaris Pendamping UMKM (HUMAN BOUNDARY)", actor: "human_professional", durationEstimateDays: 3 },
    { step: 4, id: "proc.4.external_action_kemenkumham_oss", title: "Ajukan ke Kemenkumham + OSS + DJP", actor: "external_system + human_professional", durationEstimateDays: "1-7" },
    { step: 5, id: "proc.5.delivery_close", title: "Penyerahan Hasil & Close", actor: "human_professional + ai", durationEstimateMinutes: 30 },
  ],
  humanBoundary: {
    nonDelegableToAI: [
      "Penandatanganan Akta Pendirian oleh Notaris",
      "Pengajuan resmi ke Kemenkumham AHU / OSS / DJP",
      "Pengecekan fisik dokumen asli jika diperlukan",
    ],
    contextRetentionGuarantee: { guarantee: "100% handoff context retained" },
  },
  externalActions: [
    { id: "ext.1.notary_signing", description: "Akta ditandatangani Notaris", externalParty: "Notaris Terdaftar" },
    { id: "ext.2.kemenkumham_approval", description: "SK Kemenkumham terbit", externalParty: "Kemenkumham RI (Sistem AHU)" },
    { id: "ext.3.oss_nib_issuance", description: "NIB terbit OSS", externalParty: "OSS RBA Kemenko Perekonomian" },
    { id: "ext.4.npwp_registration", description: "NPWP Badan terdaftar", externalParty: "DJP RI" },
  ],
  evidence: {
    ledgerActions: [
      { action: "work_item_created", stage: "proc.1", entityType: "consultation" },
      { action: "handoff_to_notary", stage: "proc.3", entityType: "handoff" },
      { action: "sk_kemenkumham_issued", stage: "proc.4", entityType: "government_document" },
    ],
  },
  kpi: {
    targetTimeToFirstOutcomeBusinessDays: 10,
    targetHandoffContextRetentionPercent: 100,
    targetRealWorkCompletionRatePercent: 95,
    targetHumanRepetitionRatePercent: 0,
  },
};

export const SAMPLE_P0_PT_001_CONTEXT: ProjectContext = projectContextFromWorkSeed(SAMPLE_P0_PT_001_SEED);
