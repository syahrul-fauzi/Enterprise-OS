export const STATUS = {
  PROVEN: "✅ PROVEN",
  IMPLEMENTED: "🛠️ IMPLEMENTED",
  IMPLEMENTING: "🔓 IMPLEMENTING",
  PARTIAL: "🔶 PARTIAL",
  NOT_PROVEN: "🚧 NOT PROVEN",
  LOCKED: "🔒 LOCKED",
  STABLE: "🟢 STABLE",
  EXPERIMENTAL: "🟡 EXPERIMENTAL",
  UNVERIFIED: "⚪ UNVERIFIED",
} as const;

export type StatusValue = typeof STATUS[keyof typeof STATUS];

export interface EvidenceItem {
  readonly id: string;
  readonly description: string;
  readonly status: StatusValue;
  readonly evidencePaths: readonly string[];
}

export type StatusDimension =
  | "Implementation"
  | "Validation"
  | "Maturity"
  | "Proof";

export interface StatusVocab {
  readonly term: StatusValue | string;
  readonly dimension: StatusDimension;
  readonly meaning: string;
  readonly typicalUse: string;
}

export interface AiGranularClaim {
  readonly claim: string;
  readonly status: StatusValue;
  readonly evidenceNote: string;
}

export interface AiStepBreakdown {
  readonly stepId: string;
  readonly claims: readonly AiGranularClaim[];
}


export interface CapabilityItem {
  readonly id: string;
  readonly stability: "stable" | "experimental";
  readonly certificationStatus: string;
  readonly dependencyValid: string;
  readonly contractValid: string;
  readonly providerValid: string;
  readonly compatibilityValid: string;
  readonly performanceValid: string;
}

export interface ProcedureStep {
  readonly stepId: string;
  readonly kind: string;
  readonly description: string;
  readonly delegatedTo: string;
}

export interface ProcedureItem {
  readonly name: string;
  readonly status: StatusValue;
  readonly contractPath: string;
  readonly implementationPath: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly steps: readonly ProcedureStep[];
}

export interface SurfaceRoute {
  readonly path: string;
  readonly description: string;
  readonly requirementTrace: string;
}

export interface SurfaceItem {
  readonly name: string;
  readonly status: StatusValue;
  readonly description: string;
  readonly routes: readonly SurfaceRoute[];
}

export interface GateItem {
  readonly order: number;
  readonly name: string;
  readonly status: StatusValue;
  readonly dependency: string;
  readonly lockedAreas?: readonly string[];
  readonly designNote?: string;
}

// ============================================================
// Execution Model V1 — Gate 2 DESIGN DEFINITION
// ALL fields derived from evidence in existing procedure I/O
// contracts today. Zero invention. See field evidence notes.
// ============================================================

export type ExecutionOutcome =
  | "ready"
  | "blocked"
  | "pending_ai_investigation"
  | null; // null = not yet terminal / still running

export type ExecutionDurableField =
  | "executionKey"
  | "procedure"
  | "subject"
  | "currentState"
  | "currentStep";

export type ExecutionFutureLockedField =
  | "executionId"
  | "inputSnapshot"
  | "outcome"
  | "evidenceRefs"
  | "pendingActions"
  | "continuationKey";

export interface ExecutionFieldSpec {
  readonly field: string;
  readonly type: string;
  readonly required: boolean;
  readonly evidence: string;
  readonly derivedFromToday: string;
}

export interface ExecutionIdentityRule {
  readonly rule: string;
  readonly formula: string;
  readonly example: string;
  readonly nonExample: string;
  readonly rationale: string;
}

export interface ExecutionBoundaryComparison {
  readonly concern: string;
  readonly procedure: string;
  readonly execution: string;
}

export interface ExecutionAuditFieldValidation {
  readonly field: string;
  readonly auditVerified: boolean;
  readonly verifiedIn: readonly string[];
  readonly note?: string;
}

export interface ExecutionArchitecturalDivergence {
  readonly id: string;
  readonly severity: "critical" | "high" | "medium" | "low";
  readonly title: string;
  readonly description: string;
  readonly evidencePaths: readonly string[];
  readonly architecturalImpact: string;
  readonly remediation: string;
  readonly gateBlocker: boolean;
}

export interface ExecutionLifecycleStateMapping {
  readonly lifecycleState: string;
  readonly mapsToStepId: string;
  readonly mapsToCurrentState: string;
  readonly observedInProcedure: boolean;
}

export interface ExecutionModelV1 {
  readonly name: "EOS Execution Identity V1";
  readonly version: "1.1.0";
  readonly status: StatusValue;
  readonly scope: "GATE 2 SCOPE: executionKey + 4 state fields ONLY. executionId/persistence/repository/contination LOCKED.";
  readonly auditStatus: "AUDIT VALIDATED · CORRECTED by gatekeeper 2026-08-06: executionKey ≠ executionId";
  readonly gatekeeperNote: "executionId instance semantics BELUM DIKUNCI. DILARANG menyelundupkan Gate 3/4 (persistence/resume/attempt/UUID) ke dalam Gate 2 scope.";

  // Q1 · Apa itu ExecutionIdentity Gate 2 scope? (5 fields MINIMUM)
  readonly fields: readonly ExecutionFieldSpec[];

  // Q1-bis · Explicitly LOCKED fields for Gate 2 (NOT our scope now)
  readonly futureLockedFields: readonly ExecutionFieldSpec[];

  // Q1-ter · Audit validation (per-field verified against actual code)
  readonly auditValidation: readonly ExecutionAuditFieldValidation[];

  // Q1-quatro · Lifecycle state ↔ currentStep mapping
  readonly lifecycleStepMapping: readonly ExecutionLifecycleStateMapping[];

  // Q2 · Apa boundary identity-nya? (Shared Workspace + Chat)
  readonly identity: ExecutionIdentityRule;

  // Q3 · Apa milik Execution vs Procedure?
  readonly procedureVsExecution: readonly ExecutionBoundaryComparison[];

  // Q3-bis · Architectural divergences found in audit
  readonly architecturalDivergences: readonly ExecutionArchitecturalDivergence[];

  // Q4 · Apa yang harus durable di Gate 2 scope? (5 fields SAJA, sesuaikan dengan fields)
  readonly durable: {
    readonly minimumMustSurvive: readonly ExecutionDurableField[];
    readonly rationale: string;
    readonly gate2ScopeNote: string;
    readonly explicitlyLockedInGate2: readonly ExecutionFutureLockedField[];
    readonly ephemeralRationale: string;
  };

  readonly canonicalExample: {
    readonly executionKey: string;
    readonly procedure: string;
    readonly subject: { readonly releaseId: string };
    readonly currentState: string;
    readonly currentStep: string;
  };
}

export const EXECUTION_MODEL_V1: ExecutionModelV1 = Object.freeze({
  name: "EOS Execution Identity V1",
  version: "1.1.0",
  status: STATUS.PARTIAL,
  scope: "GATE 2 SCOPE: executionKey + 4 state fields ONLY. executionId/persistence/repository/contination LOCKED.",
  auditStatus: "AUDIT VALIDATED · CORRECTED by gatekeeper 2026-08-06: executionKey ≠ executionId",
  gatekeeperNote: "executionId instance semantics BELUM DIKUNCI. DILARANG menyelundupkan Gate 3/4 (persistence/resume/attempt/UUID) ke dalam Gate 2 scope.",

  // ---- Q1 · APA ITU EXECUTIONIDENTITY GATE2 SCOPE? · 5 fields MINIMUM SAJA ----
  fields: Object.freeze<ExecutionFieldSpec[]>([
    Object.freeze({
      field: "executionKey",
      type: "string (stable correlation key, DETERMINISTIC dari procedure + subject, BUKAN instance UUID)",
      required: true,
      evidence: "procedure output already contains procedureId + input contract required field releaseId = subject. Dua field ini bersama = stable key untuk menjawab: 'pekerjaan apa yang sedang saya lihat ini?'",
      derivedFromToday: "workspace/procedures/prepare-release/contracts.ts output.procedureId + input.releaseId",
    }),
    Object.freeze({
      field: "procedure",
      type: "string (procedure id, e.g. 'prepare_release')",
      required: true,
      evidence: "procedure output field 'procedureId = prepare_release' already exists today",
      derivedFromToday: "procedures/prepare-release implementation:92 output.procedureId = 'prepare_release'",
    }),
    Object.freeze({
      field: "subject",
      type: "Record<string, unknown> (domain object being operated on, primer required field)",
      required: true,
      evidence: "prepare_release input REQUIRED field 'releaseId' = subject primer of release domain. Procedure FAIL dengan invalid_input jika releaseId kosong.",
      derivedFromToday: "workspace/procedures/prepare-release/contracts.ts PrepareReleaseInput",
    }),
    Object.freeze({
      field: "currentState",
      type: "running.intermediate | waiting.ai_or_human | terminal (observable lifecycle position)",
      required: true,
      evidence: "procedure output readiness.status + intermediate observable via stepId pointer position. 6 lifecycle states → 3 coarse buckets.",
      derivedFromToday: "state.procedureLifecycle states[] (validate_inputs..determine_final_posture)",
    }),
    Object.freeze({
      field: "currentStep",
      type: "string (stepId pointer — step terakhir yang dijalankan atau sedang berjalan)",
      required: true,
      evidence: "procedure output steps[] array memiliki stepId per step, last pushed = current step pointer. 6 stepId teramati konfirmasi 1:1 dengan lifecycle state.",
      derivedFromToday: "procedure impl stepId array: validate-inputs .. determine-final-posture",
    }),
  ]),

  // ---- Q1-bis · EXPLICITLY LOCKED for Gate 2. TIDAK MASUK SCOPE. ----
  futureLockedFields: Object.freeze<ExecutionFieldSpec[]>([
    Object.freeze({
      field: "executionId",
      type: "INSTANCE identity (belum dikunci mekanismenya — bukan scope Gate 2)",
      required: false,
      evidence: "GATEKEEPER CORRECTION: executionKey = procedure:subject digunakan untuk correlation 'pekerjaan apa ini'. executionId = identity dari SATU instance tertentu (kali ini vs 10:00 vs 11:00) BELUM DIKUNCI. Tidak boleh UUID random / attempt ID / repository sekarang.",
      derivedFromToday: "Future gate concern. Scope stop = Gate 2 remediation.",
    }),
    Object.freeze({
      field: "inputSnapshot",
      type: "procedure input full snapshot (optional future concern)",
      required: false,
      evidence: "Subject adalah bagian dari durable set. Input optional lain (limit dll) = compute-ulang-able dari default. Bukan scope Gate 2.",
      derivedFromToday: "Beyond Gate 2.",
    }),
    Object.freeze({
      field: "outcome",
      type: "ready | blocked | pending_ai_investigation | null",
      required: false,
      evidence: "Nilai outcome bisa di-DERIVE dari currentState + procedure capability call terakhir (rerun if needed). Persist = Gate 3 concern.",
      derivedFromToday: "Beyond Gate 2.",
    }),
    Object.freeze({
      field: "evidenceRefs",
      type: "evidence registry IDs",
      required: false,
      evidence: "Evidence registry = READ-ONLY scan filesystem. Write-enabled registry = Gate 3. Belum ada registry contract untuk write.",
      derivedFromToday: "Gate 3 Durable Evidence frontier.",
    }),
    Object.freeze({
      field: "pendingActions",
      type: "dequeue/resolve WAIT actions",
      required: false,
      evidence: "Menghasilkan state transition persistence = Gate 3/4. Kita baru normalisasi AI branch mark di DIV-002 remediation — BUKAN resolve/resume.",
      derivedFromToday: "Gate 4 Continuation frontier.",
    }),
    Object.freeze({
      field: "continuationKey",
      type: "resume token checkpointing",
      required: false,
      evidence: "Procedure belum punya resume(). WAIT_FOR_AI_OR_HUMAN belum reversible. Gate 4 concern total.",
      derivedFromToday: "Gate 4 Continuation frontier.",
    }),
  ]),

  // ---- Q1-3 · AUDIT VALIDATION · Per-field verified against actual code ----
  auditValidation: Object.freeze<ExecutionAuditFieldValidation[]>([
    Object.freeze({
      field: "executionKey",
      auditVerified: true,
      verifiedIn: Object.freeze([
        "workspace/procedures/prepare-release/contracts.ts (procedureId output field + releaseId required input)",
        "workspace/apps/web/app/api/procedure/prepare-release/route.ts (shared invocation no identity yet)",
      ]),
      note: "Stable correlation key = procedure + subject. Dua component field sudah ada secara terpisah. Deterministic formula verified. Current: no code yet, tapi 2 fields precondition SUDAH ADA.",
    }),
    Object.freeze({
      field: "procedure",
      auditVerified: true,
      verifiedIn: Object.freeze([
        "workspace/procedures/prepare-release/implementation.ts:92,249 (output.procedureId = 'prepare_release')",
      ]),
    }),
    Object.freeze({
      field: "subject",
      auditVerified: true,
      verifiedIn: Object.freeze([
        "workspace/procedures/prepare-release/contracts.ts:41-44 (PrepareReleaseInput.releaseId REQUIRED)",
        "workspace/procedures/prepare-release/implementation.ts:90 (early exit if missing releaseId)",
      ]),
      note: "releaseId = 100% confirmed primer subject domain. Procedure tidak bisa dijalankan tanpa subject.",
    }),
    Object.freeze({
      field: "currentState",
      auditVerified: true,
      verifiedIn: Object.freeze([
        "workspace/procedures/prepare-release/contracts.ts (PrepareReleaseReadinessStatus ready | blocked | pending_ai_investigation)",
        "workspace/procedures/prepare-release/implementation.ts (readinessStatus assignment)",
      ]),
      note: "3 terminal states confirmed. Intermediate states via stepId pointer position (running.intermediate / waiting.* / terminal buckets).",
    }),
    Object.freeze({
      field: "currentStep",
      auditVerified: true,
      verifiedIn: Object.freeze([
        "workspace/procedures/prepare-release/implementation.ts stepId: validate-inputs, assess-requirements, assess-traceability, assess-evidence, trigger-ai-investigation, determine-final-posture",
      ]),
      note: "6 concrete stepId values observed 1:1 dengan lifecycle state. Last pushed step = current step pointer.",
    }),
    Object.freeze({
      field: "executionId",
      auditVerified: false,
      verifiedIn: Object.freeze([]),
      note: "EXPLICITLY LOCKED Gate 2 scope. Instance identity (manakah eksekusi 10:00 vs 11:00?) BELUM DIKUNCI mekanismenya. Tidak boleh UUID / attempt ID di Gate 2.",
    }),
    Object.freeze({
      field: "inputSnapshot",
      auditVerified: false,
      verifiedIn: Object.freeze([]),
      note: "EXPLICITLY LOCKED Gate 2 scope. Subject adalah bagian dari durable set. Full snapshot optional = beyond scope.",
    }),
    Object.freeze({
      field: "outcome",
      auditVerified: false,
      verifiedIn: Object.freeze([]),
      note: "EXPLICITLY LOCKED Gate 2 scope. Outcome derivable dari capability rerun. Persist = Gate 3.",
    }),
  ]),

  // ---- Q1-4 · LIFECYCLE STATE ↔ STEP ID MAPPING — 1:1 correspondence verified ----
  lifecycleStepMapping: Object.freeze<ExecutionLifecycleStateMapping[]>([
    Object.freeze({
      lifecycleState: "validate_inputs",
      mapsToStepId: "validate-inputs",
      mapsToCurrentState: "running.intermediate",
      observedInProcedure: true,
    }),
    Object.freeze({
      lifecycleState: "assess_requirements",
      mapsToStepId: "assess-requirements",
      mapsToCurrentState: "running.intermediate",
      observedInProcedure: true,
    }),
    Object.freeze({
      lifecycleState: "assess_traceability",
      mapsToStepId: "assess-traceability",
      mapsToCurrentState: "running.intermediate",
      observedInProcedure: true,
    }),
    Object.freeze({
      lifecycleState: "assess_evidence",
      mapsToStepId: "assess-evidence",
      mapsToCurrentState: "running.intermediate",
      observedInProcedure: true,
    }),
    Object.freeze({
      lifecycleState: "trigger_ai_investigation",
      mapsToStepId: "trigger-ai-investigation",
      mapsToCurrentState: "waiting.ai_or_human",
      observedInProcedure: true,
    }),
    Object.freeze({
      lifecycleState: "determine_final_posture",
      mapsToStepId: "determine-final-posture",
      mapsToCurrentState: "terminal",
      observedInProcedure: true,
    }),
  ]),

  // ---- Q2 · APA BOUNDARY IDENTITY? · executionKey = correlation, NOT instance executionId ----
  identity: Object.freeze<ExecutionIdentityRule>({
    rule: "SAME procedure + SAME subject = SAME executionKey. Workspace dan Chat MELIHAT PEKERJAAN YANG SAMA jika keduanya menjalankan procedure yang sama atas subject yang sama.",
    formula: "executionKey = `${procedure}:${canonicalSubjectKey}`  ← BUKAN executionId. executionId instance semantics LOCKED for future gate.",
    example: "executionKey = prepare_release:release/EOS-003 → Workspace buka EOS-003 dan Chat tanya status EOS-003 resolve ke KEY YANG SAMA = korelasi pekerjaan yang sama.",
    nonExample: "executionKey = uuid-A/uuid-B PER CALL (tolak). executionId = 10:00-instance (belum dikunci scope Gate 2).",
    rationale:
      "Manusia bertanya: 'Pekerjaan yang saya lihat ini sebenarnya pekerjaan yang mana?'. executionKey menjawabnya dengan stable correlation identity. executionId (instance run 10:00 vs 11:00 vs 14:00) adalah future gate concern yang BELUM kita butuhkan — jangan menyelundupkan.",
  }),

  // ---- Q3 · EXECUTION vs PROCEDURE BOUNDARY ----
  procedureVsExecution: Object.freeze<ExecutionBoundaryComparison[]>([
    Object.freeze({
      concern: "Abstraksi",
      procedure: "Template / resep — 'bagaimana pekerjaan DILAKUKAN'. Stateless. Satu Procedure bisa menjalankan ribuan Execution.",
      execution: "Instance nyata — 'pekerjaan ini UNTUK SUBJEK INI, DALAM STATE INI, SAAT INI'. Stateful. Satu execution tepat milik satu procedure.",
    }),
    Object.freeze({
      concern: "Contoh",
      procedure: "'prepare_release' = rangkaian assess requirement → assess RTM → assess evidence → aggregate → decision.",
      execution: "'prepare_release untuk release EOS-003, saat ini berada di step assess-evidence, state=running, outcome=null.'",
    }),
    Object.freeze({
      concern: "Dimana definisi langkah?",
      procedure: "Milik Procedure (steps[] array di contracts.ts dan implementation.ts).",
      execution: "Tidak punya langkah sendiri. Selalu reference steps milik Procedure. Execution hanya mencatat step mana YANG SEDANG dijalankan (currentStep pointer).",
    }),
    Object.freeze({
      concern: "Domain logic?",
      procedure: "ZERO domain logic (hanya orkestrasi assess capability calls).",
      execution: "ZERO domain logic TOTAL. Execution hanyalah state + identity tracker. Tidak ada business decision di Execution layer. Semua decision tetap di Procedure.",
    }),
    Object.freeze({
      concern: "Surface controller memanggil apa?",
      procedure: "Procedure mendefinisikan contract signature apa yang bisa dipanggil (input/output).",
      execution: "Control Surface (Workspace / Chat) SELALU memanggil Procedure TAPI SELALU melalui Execution identity context: Procedure adalah yang dijalankan, Execution adalah identitas 'kali ini untuk siapa & state apa sekarang' sebagai first-class runtime object.",
    }),
    Object.freeze({
      concern: "Evidence apa yang dihasilkan?",
      procedure: "Mendefinisikan output fields apa yang dihasilkan saat selesai (prepare-release output contract).",
      execution: "Ketika selesai = menghasilkan EXACT output contract Procedure, tapi dibungkus sebagai output of EXECUTION INI, dan SELANJUTNYA (Gate 3) Execution ID ini menjadi attribution untuk evidence registry record yang tercipta (producedBy = executionId ini).",
    }),
  ]),

  // ---- Q3-bis · ARCHITECTURAL DIVERGENCES · Remediation = OPEN NOW ----
  architecturalDivergences: Object.freeze<ExecutionArchitecturalDivergence[]>([
    Object.freeze({
      id: "DIV-001",
      severity: "critical",
      title: "DUAL ORCHESTRATION IMPLEMENTATION → REMEDIATION OPEN NOW",
      description:
        "Dua implementasi orchestration YANG SAMA (prepare_release) hidup berdampingan: Path A = procedure prepareReleaseProcedure() direct (Workspace + Chat); Path B = workflow-engine executePrepareRelease() (duplicate). Keduanya 3 capability call SAMA tapi posture + AI branch + return shape BERBEDA.",
      evidencePaths: Object.freeze([
        "workspace/procedures/prepare-release/implementation.ts (prepareReleaseProcedure)",
        "workspace/capabilities/workflow-engine/implementation/services/workflow-engine.service.ts (executePrepareRelease)",
      ]),
      architecturalImpact:
        "VIOLASI Single Source of Truth. Execution Identity nanti harus jadi identitas dari 'apa yang sebenarnya dijalankan' — kalau definisi 'dijalankan seperti apa' ada dua, identity object = makna ganda.",
      remediation:
        "Refactor workflow-engine.executePrepareRelease() untuk MENDELEGASI ke prepareReleaseProcedure() YANG SAMA. WorkflowExecutionResult = adaptasi DARI PrepareReleaseOutput. Single orchestration SSoT = procedure layer. Workflow engine = alternate control surface SEPERTI Workspace/Chat.",
      gateBlocker: true,
    }),
    Object.freeze({
      id: "DIV-002",
      severity: "medium",
      title: "AI BRANCH SEMANTICS INCONSISTENCY → REMEDIATION: NORMALIZE ONLY",
      description:
        "Path A: AI branch = mark triggered (no side-effect). Path B: AI branch = actual dispatch agentOrchestrationService.dispatch(). Scope remediation HANYA samakan observable state — JANGAN buat continuation/resume (Gate 4).",
      evidencePaths: Object.freeze([
        "workspace/procedures/prepare-release/implementation.ts (mark triggered)",
        "workflow-engine.service.ts (actual dispatch)",
      ]),
      architecturalImpact:
        "Dua surface memanggil 'procedure yang sama' untuk subject yang sama TAPI menghasilkan observable AI branch behavior YANG BERBEDA. Ini membunuh execution consistency sebelum Execution Identity ada.",
      remediation:
        "Single source of truth AI branch HARUS di procedure layer (mark = action yang dibutuhkan). Execution runtime layer JIKA DAN HANYA JIKA punya dispatch capability bisa action-mark → dispatch sync. Tanpa execution capability = mark-only seperti procedure impl sekarang. Procedure = definisikan branch-condition + required-action, TIDAK memutuskan when/how actual dispatch terjadi.",
      gateBlocker: true,
    }),
    Object.freeze({
      id: "DIV-003",
      severity: "low",
      title: "readiness.status enum mismatch 'unknown' → fix as part DIV-001",
      description:
        "workflow-engine set readinessStatus = 'unknown' (tidak ada di PrepareReleaseReadinessStatus). Fix ini sebagai side-effect DIV-001 refactor (karena adapt dari output procedure otomatis konsisten).",
      evidencePaths: Object.freeze([]),
      architecturalImpact: "Low impact today. Fixed automatically after DIV-001 delegation refactor.",
      remediation: "Auto-resolve after DIV-001 merge (procedure contract enum = single source).",
      gateBlocker: false,
    }),
    Object.freeze({
      id: "DIV-004",
      severity: "high",
      title: "100% Ephemeral Execution Today — TIDAK BOLEH DI-FIX SEKARANG",
      description:
        "Setiap call = fresh generatedAt, tidak ada correlation, tidak ada persistence. INI = BUKAN remediasi Gate 2 scope. Ini = Execution Identity Runtime Implementation yang masuk Gate 2 step PASSED + remediation merged.",
      evidencePaths: Object.freeze([]),
      architecturalImpact: "Frontier yang disengaja — TIDAK BOLEH disentuh sekarang. Stop line.",
      remediation:
        "STOP LINE. DILARANG membuat ExecutionRepository, database, persistence, executionId random, resume, durable evidence, worker, API, capability baru — semua ini = next steps GATE 2 PASS REMEDIATION → review → baru runtime slice terkecil.",
      gateBlocker: false,
    }),
  ]),

  // ---- Q4 · APA YANG HARUS DURABLE? · 5 fields (sesuai scope Gate 2) SAJA ----
  durable: Object.freeze({
    minimumMustSurvive: Object.freeze<ExecutionDurableField[]>([
      "executionKey", // Stable correlation key: procedure+subject = jawaban "pekerjaan apa ini?"
      "procedure",    // Reference procedure template
      "subject",      // Subjek domain primer (releaseId)
      "currentState", // Observable lifecycle position
      "currentStep",  // Step pointer terakhir
    ]),

    rationale:
      "5 field ini = MINIMUM yang diperlukan untuk menjawab pertanyaan manusia sederhana: 'Pekerjaan yang sedang saya lihat ini sebenarnya pekerjaan yang mana?'. Tanpa 5 ini, Workspace dan Chat tidak bisa bilang 'pekerjaan yang sama' meskipun procedure dan subject identik.",

    gate2ScopeNote:
      "SCOPE GATE 2: HANYA 5 field ini. Semua yang lain = EXPLICITLY LOCKED. DILARANG menambah field ke minimum durable set tanpa gatekeeper review PASS.",

    explicitlyLockedInGate2: Object.freeze<ExecutionFutureLockedField[]>([
      "executionId",      // Instance identity (run 10:00 vs 11:00) = future gate. BELUM DIKUNCI mekanismenya.
      "inputSnapshot",    // Full snapshot = beyond scope. Subject = sudah ada di durable set.
      "outcome",          // ready/blocked/pending_ai = derivable dari rerun capability.
      "evidenceRefs",     // Gate 3 concern = evidence registry write.
      "pendingActions",   // Gate 4 concern = dequeue/resume.
      "continuationKey",  // Gate 4 concern = resume checkpointing.
    ]),

    ephemeralRationale:
      "Prinsip filosofi EOS: anti persistence-monster. SELALU pilih compute-ulang-able over persist-kalau-bingung. Capability state (Requirement, RTM, Evidence) = sudah persistent di repo masing-masing. Execution state = pointer tipis ke capability latest + procedure step. JANGAN simpan posture aggregate di execution — procedure adalah pure function yang bisa meng-hasilkan ulang kapan saja.",
  }),

  // Contoh canonical — Gate 2 scope version (tanpa outcome, tanpa executionId)
  canonicalExample: Object.freeze({
    executionKey: "prepare_release:release/EOS-003",
    procedure: "prepare_release",
    subject: Object.freeze({ releaseId: "EOS-003" }),
    currentState: "waiting.ai_or_human",
    currentStep: "trigger-ai-investigation",
  }),
});

export const EOS_KNOWLEDGE_MODEL = Object.freeze({
  identity: Object.freeze({
    name: "Enterprise Operating System",
    version: "V1",
    lastUpdated: "2026-08-06",
    mission:
      "Sistem yang bisa mengeksekusi pekerjaan enterprise dan menjelaskan keadaan dirinya sendiri — melalui dua sisi yang konsisten: WORK (eksekusi) dan KNOW (deskripsi diri).",
    whatIsEos:
      "EOS memisahkan fungsi WORK (eksekusi pekerjaan via Procedure + Capability) dan KNOW (self-description surface) dengan boundary yang tegas. WORK side sudah berdiri dengan Vertical Slice V1 Governed Release Readiness: procedure prepare_release orkestrasi 3 capability nyata (Requirement + RTM + Evidence), dapat dikendalikan dari 2 surface (Workspace dan Chat) tanpa duplikasi business logic. KNOW side (surface ini) TELAH LULUS Human Black-Box #3 — sekarang self-describing, menjelaskan dirinya sendiri tanpa engineer menjadi penerjemah relationship Procedure/Capability/Evidence.",
    terminology: Object.freeze([
      Object.freeze({ term: "KNOW", definition: "Surface untuk MEMAHAMI keadaan EOS (halaman ini). Tidak mengeksekusi pekerjaan." }),
      Object.freeze({ term: "WORK", definition: "Surface untuk MELAKUKAN pekerjaan (apps/web). Buka /readiness untuk masuk WORK." }),
      Object.freeze({ term: "Procedure", definition: "Urutan langkah pekerjaan (SOP) + branching condition. Pure orchestration, ZERO domain logic sendiri. Contoh: prepare_release." }),
      Object.freeze({ term: "Capability", definition: "Primitif bisnis reusable yang mengandung domain logic + persistence. Procedure mendelegasikan pekerjaan ke Capability." }),
      Object.freeze({ term: "Evidence", definition: "Dokumen/record terverifikasi yang membuktikan suatu klaim benar. Bukan sekadar output procedure (butuh write ke registry)."}),
      Object.freeze({ term: "Execution", definition: "Satu kejadian nyata ketika Procedure dijalankan atas Subject tertentu. Identity: procedure + subject = executionId deterministik. Workspace & Chat berbagi instance Execution yang SAMA." }),
      Object.freeze({ term: "Gate", definition: "Milestone dependency order. Tidak boleh lompat. Saat ini: Gate 1 closed, Gate 2 = Execution Identity (Design Open)." }),
    ]),
    workBridgeUrl: "http://localhost:3004/readiness?surface=split",
  }),

  statusVocabulary: Object.freeze<StatusVocab[]>([
    Object.freeze({ term: STATUS.IMPLEMENTED, dimension: "Implementation", meaning: "Route/function ada dan HTTP/code path bisa dipanggil, tapi BELUM terbukti secara evidence-driven acceptance.", typicalUse: "File exists, route returns 200. Beda level: IMPLEMENTED < PROVEN." }),
    Object.freeze({ term: STATUS.IMPLEMENTING, dimension: "Implementation", meaning: "Sedang dibangun / sedang divalidasi. Human gate belum ditutup.", typicalUse: "Seluruh Surface KNOW saat ini." }),

    Object.freeze({ term: STATUS.PROVEN, dimension: "Validation", meaning: "Klaim memiliki evidence nyata di registry.", typicalUse: "Runtime claim, capability end-to-end, architectural pattern." }),
    Object.freeze({ term: STATUS.PARTIAL, dimension: "Validation", meaning: "Sebagian kriteria tercapai tapi tidak semua (certification, maturity).", typicalUse: "Capability registry certification (performance evidence UNVERIFIED untuk semua)." }),
    Object.freeze({ term: STATUS.NOT_PROVEN, dimension: "Validation", meaning: "Sejauh ini BELUM ada evidence yang memverifikasi klaim tersebut.", typicalUse: "Frontier gates: Execution Identity, Durable Evidence, Continuation." }),
    Object.freeze({ term: STATUS.LOCKED, dimension: "Validation", meaning: "Dependency gate belum terbuka. Tidak boleh dikerjakan.", typicalUse: "apps/api, apps/worker, Agent, Execution Identity." }),

    Object.freeze({ term: STATUS.STABLE, dimension: "Maturity", meaning: "Maturity Capability = Stable. Tidak sama dengan PROVEN.", typicalUse: "api-platform, governance-evidence, governance-read-model, trust-framework." }),
    Object.freeze({ term: STATUS.EXPERIMENTAL, dimension: "Maturity", meaning: "Maturity Capability = Experimental. Sedang dievaluasi.", typicalUse: "requirement-management, evidence-registry, RTM, legal dll." }),

    Object.freeze({ term: STATUS.UNVERIFIED, dimension: "Proof", meaning: "Tidak ada data verifikasi sama sekali.", typicalUse: "Performance Valid di semua Capability (registry)." }),
  ]),

  statusDimensionLabels: Object.freeze<Record<StatusDimension, { readonly label: string; readonly explanation: string }>>({
    Implementation: Object.freeze({
      label: "DIMENSI ① — IMPLEMENTATION",
      explanation: "Apakah kode/route ada dan bisa dipanggil? (BELUM bicara apakah benar/salah).",
    }),
    Validation: Object.freeze({
      label: "DIMENSI ② — VALIDATION",
      explanation: "Apakah klaim tersebut terbukti oleh evidence registry? (Epistemic state EOS).",
    }),
    Maturity: Object.freeze({
      label: "DIMENSI ③ — MATURITY",
      explanation: "Seberapa matang sebuah Capability (stable vs experimental). Terpisah dari PROVEN/VALIDATION.",
    }),
    Proof: Object.freeze({
      label: "DIMENSI ④ — PROOF",
      explanation: "Data verifikasi sub-kriteria per evidence field. (Contoh: performance evidence = UNVERIFIED untuk semua).",
    }),
  }),

  evidenceContext: Object.freeze({
    title: "Evidence Trace Chain — Academic vs Release Readiness",
    summary:
      "REQ-001..REQ-008 + REQ-014 adalah evidence milik Academic Vertical Slice. Evidence tersebut MEMBUKTIKAN bahwa 3 underlying capability primitive (Requirement Management, RTM, Evidence Registry) BENAR-BENAR bekerja di slice lain. Procedure prepare_release KEMUDIAN mengkomposisikan (reuse) ketiga capability YANG SUDAH TERBUKTI tersebut untuk pekerjaan release readiness.",
    chain: Object.freeze([
      Object.freeze({
        layer: "1. Proven Primitive Evidence (Academic slice)",
        content: "REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-014 = evidence bahwa 3 primitive capability bekerja dengan benar.",
        status: STATUS.PROVEN,
      }),
      Object.freeze({
        layer: "2. Primitive Capability Reuse (Consumed by prepare_release)",
        content: "Requirement Management, RTM, Evidence Registry = 3 capability yang SUDAH DIBUKTIKAN di layer 1, lalu DIPAKAI oleh procedure prepare_release.",
        status: STATUS.PROVEN,
      }),
      Object.freeze({
        layer: "3. Prepare Release Procedure Orchestration",
        content: "prepare_release = orkestrasi 3 capability terbukti + AI conditional branch + posture aggregator (0 domain logic sendiri).",
        status: STATUS.PROVEN,
      }),
      Object.freeze({
        layer: "4. Durable Evidence (Procedure → Registry Record)",
        content: "Output procedure prepare_release otomatis di-persist sebagai evidence durable (Frontier-2). Saat ini = procedure output object BUKAN registry record.",
        status: STATUS.NOT_PROVEN,
      }),
    ]),
  }),

  aiStep: Object.freeze<AiStepBreakdown>({
    stepId: "trigger_ai_investigation",
    claims: Object.freeze([
      Object.freeze({
        claim: "Conditional trigger (UNKNOWN → AI branch)",
        status: STATUS.PROVEN,
        evidenceNote: "Code: hasUnknown=true → masuk AI branch, tidak dipanggil di jalur lain.",
      }),
      Object.freeze({
        claim: "WAIT_FOR_AI_OR_HUMAN state emitted",
        status: STATUS.PROVEN,
        evidenceNote: "Procedure mengembalikan readiness.status=pending_ai_investigation pada branch ini.",
      }),
      Object.freeze({
        claim: "AI investigation result produced",
        status: STATUS.NOT_PROVEN,
        evidenceNote: "Hanya trigger invocation, tidak ada code path yang menunggu atau memproses hasil AI.",
      }),
      Object.freeze({
        claim: "Resume procedure after AI resolves",
        status: STATUS.NOT_PROVEN,
        evidenceNote: "Continuation model = Frontier-3. Procedure tidak punya resume() primitive. Menunggu Gate 2 Execution Identity terbukti dahulu baru bisa design Gate 3/4.",
      }),
    ]),
  }),

  executionModel: EXECUTION_MODEL_V1,

  architecture: Object.freeze({
    diagram: `
                     EOS V1
                       │
       ┌─────────────┴─────────────┐
       │                           │
      KNOW                        WORK
       │                           │
  apps/docs                    apps/web
  ✅ PASSED                    ✅ PROVEN
       │                    ┌──────┴──────┐
       │                    │             │
       │                Workspace       Chat
       │                    │             │
       │                    └──────┬──────┘
       │                           │
       │                           │ ▶️ EXECUTION = frontier sekarang
       │                    ┌──────▼──────┐
       │                    │  Execution  │ ← DESIGN OPEN
       │                    │   Identity  │
       │                    └──────┬──────┘
       │                           │
       │                      PROCEDURE
       │                           │
       │                     prepare_release
       │                           │
       │              ┌────────────┼────────────┐
       │              ▼            ▼            ▼
       │         Requirement      RTM       Evidence
       │
       └─────────────── KNOW WHAT IS TRUE`,
    layers: Object.freeze([
      Object.freeze({
        name: "Experience Surfaces",
        items: ["apps/web (WORK): Workspace + Chat", "apps/docs (KNOW): Self-description ✅ PASSED Gate 1"],
        principle: "ZERO business logic — hanya shared procedure call renderer",
      }),
      Object.freeze({
        name: "Execution Identity (Gate 2 · DESIGN OPEN)",
        items: ["Canonical Execution Model V1", "Deterministic executionId = procedure:subject", "5 minimum durable fields"],
        principle: "One Execution instance → multiple control surfaces (Workspace & Chat SHARED identity)",
      }),
      Object.freeze({
        name: "Procedure Layer",
        items: ["prepare_release (sole proven procedure)"],
        principle: "ZERO domain logic — pure orchestration, delegates to Capabilities",
      }),
      Object.freeze({
        name: "Capability Layer",
        items: [
          "requirement-management",
          "requirements-traceability-matrix",
          "evidence-registry",
          "governance-evidence",
          "governance-read-model",
          "trust-framework",
          "workflow-engine",
          "identity",
          "api-platform (locked)",
          "agent-orchestration (locked)",
          "knowledge-graph (locked)",
          "connector-ecosystem (locked)",
          "observability (locked)",
          "security-hardening (locked)",
          "legal-case (locked)",
          "legal-document (locked)",
        ],
        principle: "Single source of domain data and business rules",
      }),
      Object.freeze({
        name: "Frontier Locks",
        items: [
          "Execution Runtime Implementation — 🔒 DESIGN MODE (specification ONLY)",
          "Durable Evidence Store — 🔒 LOCKED dep. on Gate 2 PASS",
          "Continuation/Resume — 🔒 LOCKED dep. on Gate 3 PASS",
          "API / Worker / Agent — 🔒 LOCKED UNTIL GATES PROVEN",
        ],
        principle: "Dependency order enforced — no gate skipped",
      }),
    ]),
    boundaryRule:
      "WORK dan KNOW adalah experience surfaces murni. Keduanya TIDAK punya execution instance sendiri. Kedua surface memanggil procedure YANG SAMA melalui Execution identity YANG SAMA (shared execution: procedure:subject → shared state). Prohibition: tidak boleh ada forking business logic di surface layer.",
  }),

  capabilities: Object.freeze({
    provenWork: Object.freeze([
      Object.freeze({
        name: "Academic Community End-to-End Slice",
        status: STATUS.PROVEN,
        evidence: "products/academic/evidence/verification/functional-test-report.json",
        testsPassed: "4/4",
        reuseRatio: "100% capability reuse",
      }),
      Object.freeze({
        name: "REQ → RTM → Evidence Trace Chain",
        status: STATUS.PROVEN,
        evidence: ".eos/evidence/req-001-rtm.yaml through req-008-rtm.yaml",
        coverage: "8 requirements fully traced",
      }),
    ]),

    registry: Object.freeze<CapabilityItem[]>([
      Object.freeze({
        id: "api-platform",
        stability: "stable",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "PASS",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "governance-evidence",
        stability: "stable",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "PASS",
        compatibilityValid: "PASS",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "governance-read-model",
        stability: "stable",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "PASS",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "trust-framework",
        stability: "stable",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "PASS",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "agent-orchestration",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "connector-ecosystem",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "evidence-registry",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "identity",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "knowledge-graph",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "legal-case",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "legal-document",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "observability",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "requirement-management",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "requirements-traceability-matrix",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "security-hardening",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
      Object.freeze({
        id: "workflow-engine",
        stability: "experimental",
        certificationStatus: "PARTIAL",
        dependencyValid: "PASS",
        contractValid: "PASS",
        providerValid: "NOT_APPLICABLE",
        compatibilityValid: "NOT_APPLICABLE",
        performanceValid: "UNVERIFIED",
      }),
    ]),

    certificationSummary: Object.freeze({
      totalCapabilities: 16,
      certifiedCapabilities: 0,
      partialCapabilities: 16,
      stableCapabilities: 4,
      experimentalCapabilities: 12,
      performanceEvidenceAvailable: 0,
      registrySource: "foundation/evidence/registry/capability-certification.json",
    }),

    lockedItems: Object.freeze([
      Object.freeze({
        name: "apps/api Development",
        reason: "Wait until Execution Identity + Durable Evidence + Continuation gates proven (all 5 gates PASS)",
      }),
      Object.freeze({
        name: "apps/worker Development",
        reason: "Wait until Execution Identity + Durable Evidence + Continuation gates proven",
      }),
      Object.freeze({
        name: "New Capability Creation",
        reason: "Requirement Management, RTM, Evidence Registry cukup untuk vertical slice saat ini. Penambahan capability ditunda.",
      }),
      Object.freeze({
        name: "New Procedure Creation",
        reason: "Hanya prepare_release adalah procedure aktif. Komposisi dari capability yang sudah ada diprioritaskan.",
      }),
      Object.freeze({
        name: "Execution Identity RUNTIME Implementation (code-level)",
        reason: "Gate 2 SAAT INI = DESIGN PHASE. Spec Execution Model V1 sudah didefinisikan di /execution. Runtime implementation TIDAK dibuka sampai design review PASS dan Gate 2 secara official closed.",
      }),
      Object.freeze({
        name: "Durable Evidence Registry Write",
        reason: "Gate 3. Menunggu Execution Identity terbukti terlebih dahulu.",
      }),
      Object.freeze({
        name: "Continuation / Resume Engine",
        reason: "Gate 4. Menunggu Durable Evidence terbukti terlebih dahulu.",
      }),
      Object.freeze({
        name: "AI Agent Expansion beyond conditional branch",
        reason: "AI tetap sebagai conditional fallback investigasi. Agent loop besar dilarang.",
      }),
      Object.freeze({
        name: "DSL Development",
        reason: "Procedure/Capability contract model tetap statis terlebih dahulu.",
      }),
      Object.freeze({
        name: "New Experience Surfaces beyond WORK + KNOW",
        reason: "Hanya apps/web (WORK) dan apps/docs (KNOW) yang aktif. CLI/Agent diblokir.",
      }),
    ]),
  }),

  procedures: Object.freeze({
    active: Object.freeze<ProcedureItem[]>([
      Object.freeze({
        name: "prepare_release",
        status: STATUS.PROVEN,
        contractPath: "procedures/prepare-release/contracts.ts",
        implementationPath: "procedures/prepare-release/implementation.ts",
        inputs: Object.freeze(["releaseId (required)", "limit (optional)"]),
        outputs: Object.freeze([
          "procedureId = 'prepare_release'",
          "readiness.status (ready | blocked | pending_ai_investigation)",
          "requirements posture (total / verified / blocked / unknown)",
          "traceability posture (complete, gap count, gaps)",
          "evidence posture (complete, total, paths)",
          "ai.invoked flag + ambiguousRequirements",
          "blockers list",
          "steps[] (id, kind, status, summary, output)",
        ]),
        steps: Object.freeze<ProcedureStep[]>([
          Object.freeze({
            stepId: "validate-inputs",
            kind: "input.validate",
            description: "Validasi releaseId tidak kosong",
            delegatedTo: "procedure-internal (zero domain logic)",
          }),
          Object.freeze({
            stepId: "assess-requirements",
            kind: "requirement.assess",
            description: "Assess verification posture dari semua requirement dalam rilis",
            delegatedTo: "capability: requirement-management",
          }),
          Object.freeze({
            stepId: "assess-traceability",
            kind: "traceability.assess",
            description: "Assess kelengkapan RTM trace chain REQ → Implementation → Evidence",
            delegatedTo: "capability: requirements-traceability-matrix",
          }),
          Object.freeze({
            stepId: "assess-evidence",
            kind: "evidence.assess",
            description: "Assess coverage evidence registry untuk setiap requirement",
            delegatedTo: "capability: evidence-registry",
          }),
          Object.freeze({
            stepId: "trigger-ai-investigation",
            kind: "ai.investigate",
            description: "CONDITIONAL — hanya jika ada requirement status UNKNOWN. Panggil agent investigasi ambiguitas.",
            delegatedTo: "capability: agent-orchestration (WAIT_FOR_AI_OR_HUMAN)",
          }),
          Object.freeze({
            stepId: "determine-final-posture",
            kind: "posture.assess",
            description: "Deterministic final call: ready | blocked | pending_ai_investigation",
            delegatedTo: "procedure-internal (zero domain logic)",
          }),
        ]),
      }),
    ]),

    procedurePrinciple:
      "Procedure = orkestrasi murni. ZERO domain logic. Setiap assess* step mendelegasikan 100% ke Capability yang sesuai. AI hanya dipanggil pada state UNKNOWN (conditional branch, bukan default path).",
  }),

  surfaces: Object.freeze({
    surfaces: Object.freeze<SurfaceItem[]>([
      Object.freeze({
        name: "WORK Surface (apps/web)",
        status: STATUS.PROVEN,
        description:
          "Experience surface untuk eksekusi pekerjaan enterprise via Procedure + Capability. Terdiri dari Workspace UI dan Chat UI.",
        routes: Object.freeze<SurfaceRoute[]>([
          Object.freeze({
            path: "/readiness",
            description: "Release readiness dashboard — jalankan procedure prepare_release via UI",
            requirementTrace: "Shared procedure execution entry",
          }),
          Object.freeze({
            path: "/community",
            description: "Academic Community browse page (REQ-004 proven)",
            requirementTrace: "REQ-004",
          }),
          Object.freeze({
            path: "/research",
            description: "Academic Research browse page (REQ-003 proven)",
            requirementTrace: "REQ-003",
          }),
          Object.freeze({
            path: "/profile/[id]",
            description: "Researcher Profile detail page (REQ-005 proven)",
            requirementTrace: "REQ-005",
          }),
          Object.freeze({
            path: "/institution/[id]",
            description: "Institution detail page (REQ-006 proven)",
            requirementTrace: "REQ-006",
          }),
          Object.freeze({
            path: "/products/[productId]",
            description: "Product surface entry — renders product-specific affordance (community / professional / legal)",
            requirementTrace: "ProductExperience contract",
          }),
          Object.freeze({
            path: "/products/[productId]/requirements",
            description: "Shared Requirement management list per product",
            requirementTrace: "REQ-002",
          }),
          Object.freeze({
            path: "/products/[productId]/requirements/[requirementId]",
            description: "Shared Requirement detail view",
            requirementTrace: "REQ-002",
          }),
          Object.freeze({
            path: "/products/[productId]/requirements/[requirementId]/trace",
            description: "RTM trace view per requirement (REQ→Impl→Evidence)",
            requirementTrace: "RTM chain",
          }),
          Object.freeze({
            path: "/products/[productId]/delivery",
            description: "Product delivery view",
            requirementTrace: "Shared capability renderer",
          }),
          Object.freeze({
            path: "/requirements",
            description: "Global shared requirement list",
            requirementTrace: "Shared requirement-management capability",
          }),
          Object.freeze({
            path: "/requirements/[id]",
            description: "Global shared requirement detail",
            requirementTrace: "Shared requirement-management capability",
          }),
        ]),
      }),
      Object.freeze({
        name: "KNOW Surface (apps/docs) — THIS SURFACE",
        status: STATUS.IMPLEMENTING,
        description:
          "Self-description surface EOS. Mata manusia melihat keadaan sistem: menjawab 7 pertanyaan inti tanpa membaca source code. Status: IMPLEMENTING — human black-box validation ke-2 BELUM DIJALANKAN (ini adalah acceptance criterion Gate 1).",
        routes: Object.freeze<SurfaceRoute[]>([
          Object.freeze({
            path: "/",
            description: "EOS Overview — Identity + 7 Core Questions",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/architecture",
            description: "Arsitektur EOS — WORK/KNOW boundary + layered model",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/capabilities",
            description: "16 Capability Registry — certification PARTIAL vs PROVEN",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/procedures",
            description: "Procedure prepare_release — contract, steps, delegation rules",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/surfaces",
            description: "Daftar WORK + KNOW experience surfaces dan routes",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/state",
            description: "Procedure lifecycle state machine",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/evidence",
            description: "Evidence registry — REQ-001..008 proven + frontier pending",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/gates",
            description: "Engineering gates dependency order + status aktual",
            requirementTrace: "KNOW requirement scope",
          }),
          Object.freeze({
            path: "/execution",
            description: "Gate 2 DESIGN SPEC — Canonical Execution Model V1 (4 questions answered)",
            requirementTrace: "FRONTIER-1",
          }),
        ]),
      }),
    ]),

    sharedIdentityPlan:
      "GATE 2 DESIGN VALIDATED (audit arsitektural selesai 2026-08-06). Identity deterministik formula: executionId = `${procedure}:${canonicalSubjectKey}`. Workspace dan Chat yang menjalankan procedure YANG SAMA atas subject YANG SAMA → merujuk pada Execution instance YANG SAMA. PREREQUISITE: DIV-001 remediation (workflow-engine orchestration delegation) + DIV-002 remediation (AI branch consistency) SEBELUM runtime code dibuka. Runtime code-level sync = BELUM diimplementasikan hingga Gate 2 official PASS.",
  }),

  state: Object.freeze({
    currentMode: "Execution Identity Design Gate — Gate 2 (AUDIT VALIDATED · Remediation Prerequisite Open)",
    scope: "KNOW docs + Execution spec + Architectural divergences remediation ONLY. Execution runtime code (beyond remediation), apps/api, apps/worker, AI expansion tetap 🔒 LOCKED.",
    activeGate: "🟢 Gate 1 (apps/docs KNOW Surface) — PASSED / CLOSED · 🟡 Gate 2 DESIGN VALIDATED",
    nextGate: "🟡 Gate 2 Step 2 — Remediation: DIV-001 (single orchestration SSoT) → DIV-002 (AI branch consistency) → THEN Runtime code implementation → Gate 2 Close → Gate 3 Durable Evidence",

    procedureLifecycle: Object.freeze({
      name: "prepare_release lifecycle",
      states: Object.freeze([
        Object.freeze({
          state: "validate_inputs",
          description: "Validasi releaseId required",
          transitionsTo: "failed (if invalid) → assess_requirements (if valid)",
        }),
        Object.freeze({
          state: "assess_requirements",
          description: "Panggil requirement-management.assessVerification()",
          transitionsTo: "assess_traceability (unconditional)",
        }),
        Object.freeze({
          state: "assess_traceability",
          description: "Panggil requirements-traceability-matrix.assess()",
          transitionsTo: "assess_evidence (unconditional)",
        }),
        Object.freeze({
          state: "assess_evidence",
          description: "Panggil evidence-registry.assessEvidence()",
          transitionsTo: "determine_final_posture",
        }),
        Object.freeze({
          state: "trigger_ai_investigation",
          description: "CONDITIONAL BRANCH — hanya jika hasUnknown = true",
          transitionsTo: "WAIT_FOR_AI_OR_HUMAN → determine_final_posture",
          aiRule: "AI adalah fallback investigasi ambiguitas, bukan default path",
        }),
        Object.freeze({
          state: "determine_final_posture",
          description: "Final deterministik: READY | BLOCKED | PENDING_AI_INVESTIGATION",
          transitionsTo: "TERMINAL — output returned to caller",
        }),
      ]),
      terminalStates: Object.freeze([
        Object.freeze({
          name: "ready",
          description: "Semua check lulus (requirements verified + RTM complete + evidence complete) → release bisa deploy.",
        }),
        Object.freeze({
          name: "blocked",
          description: "Ada hard blocker (blocked requirement, RTM gap, evidence incomplete) → harus resolve blocker dahulu.",
        }),
        Object.freeze({
          name: "pending_ai_investigation",
          description:
            "Ada requirement UNKNOWN. AI investigation sudah trigger, procedure menunggu (WAIT_FOR_AI_OR_HUMAN). Continuation/resume = FUTURE GATE.",
        }),
      ]),
      continuationModel:
        "FUTURE WORK (🔒 Continuation/Resume Gate): Saat ini state PENDING_AI_INVESTIGATION belum bisa di-resume secara otomatis. Harus restart procedure setelah ambiguitas di-resolve manual.",
    }),
  }),

  evidence: Object.freeze({
    provenRequirements: Object.freeze<EvidenceItem[]>([
      Object.freeze({
        id: "REQ-014",
        description:
          "Cross-engine execution traceability: correlation_id inheritance via from_parent() method untuk seluruh rantai eksekusi.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          "implementation/shared/engine/context.py",
          ".eos/evidence/req-014-implementation-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-001",
        description:
          "Academic ProductExperience Contract + Community Affordance distinct dari shared renderer, masuk ke shared requirement capability.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-001-rtm.yaml",
          ".eos/evidence/b4-retest-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-002",
        description: "End-to-end requirement creation flow di Academic Community surface.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-002-rtm.yaml",
          ".eos/evidence/req-002-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-003",
        description: "Research Browse Page (/research) untuk Academic product.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-003-rtm.yaml",
          ".eos/evidence/req-003-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-004",
        description: "Community Directory Page (/community) untuk Academic product.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-004-rtm.yaml",
          ".eos/evidence/req-004-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-005",
        description: "Researcher Profile Page (/profile/[id]) untuk Academic product.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-005-rtm.yaml",
          ".eos/evidence/req-005-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-006",
        description: "Institution Detail Page (/institution/[id]) untuk Academic product.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-006-rtm.yaml",
          ".eos/evidence/req-006-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-007",
        description: "Community Search & Filter Feature untuk Academic product.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-007-rtm.yaml",
          ".eos/evidence/req-007-runtime-evidence.yaml",
        ]),
      }),
      Object.freeze({
        id: "REQ-008",
        description: "Research Search & Status Filter Feature untuk Academic product.",
        status: STATUS.PROVEN,
        evidencePaths: Object.freeze([
          ".eos/evidence/req-008-rtm.yaml",
          ".eos/evidence/req-008-runtime-evidence.yaml",
        ]),
      }),
    ]),

    frontierPending: Object.freeze([
      Object.freeze({
        id: "FRONTIER-1",
        name: "Execution Identity",
        description:
          "Canonical Execution Model V1 SUDAH terdefinisi (Gate 2 DESIGN OPEN): identity = procedure:subject secara deterministik. Runtime code-level implementation SHARED STATE sync Workspace ↔ Chat = BELUM terbukti (menunggu Gate 2 spec review → PASS → implementasi runtime → gate close).",
        status: STATUS.IMPLEMENTING,
        evidencePaths: Object.freeze(["apps/docs/app/execution/page.tsx (KNOW spec definition)"]),
      }),
      Object.freeze({
        id: "FRONTIER-2",
        name: "Durable Evidence Registry",
        description:
          "Output procedure prepare_release otomatis menjadi durable evidence record dengan delegasi ke Evidence Capability (procedure TIDAK langsung touch filesystem). Saat ini output procedure TIDAK OTOMATIS terdaftar di registry — pendaftaran adalah tahap terpisah yang belum terbukti.",
        status: STATUS.NOT_PROVEN,
        evidencePaths: Object.freeze([]),
      }),
      Object.freeze({
        id: "FRONTIER-3",
        name: "Continuation / Resume Engine",
        description:
          "Procedure pada state PENDING_AI_INVESTIGATION bisa di-resume otomatis setelah AI investigation selesai. Saat ini state terminal = WAIT_FOR_AI_OR_HUMAN tanpa mekanisme resume.",
        status: STATUS.NOT_PROVEN,
        evidencePaths: Object.freeze([]),
      }),
    ]),

    academicVerification: Object.freeze({
      functionalTests: "4/4 PASS",
      capabilityReuseRatio: "100% (CLR = FULL_REUSE)",
      evidenceSources: Object.freeze([
        "products/academic/evidence/verification/functional-test-report.json",
        "products/academic/evidence/verification/clr-report.json",
      ]),
    }),

    evidencePrinciple:
      "Output procedure ≠ durable evidence record secara otomatis. Pendaftaran ke evidence registry adalah step terpisah yang harus memiliki evidence sendiri. Ini mencegah self-proven circular claims.",
  }),

  gates: Object.freeze({
    gates: Object.freeze<GateItem[]>([
      Object.freeze({
        order: 1,
        name: "apps/docs KNOW Surface",
        status: STATUS.PROVEN,
        dependency: "None — FIRST GATE (Controlled Engineering Mode: scope = apps/docs saja).",
        designNote: "✅ CLOSED · Human Black-Box #3 lulus PASS tanggal 2026-08-06. EOS sekarang self-describing tanpa engineer penerjemah.",
      }),
      Object.freeze({
        order: 2,
        name: "Execution Identity",
        status: STATUS.PARTIAL,
        dependency: "KNOW Surface lulus human validation ✅ — DONE 2026-08-06",
        designNote: "🟡 DESIGN VALIDATED · Audit arsitektural selesai 2026-08-06. Canonical Execution Model V1 AUDIT-VALIDATED (10 fields: 7 VERIFIED, 3 PLACEHOLDER/Gate3-4 concern). Lifecycle ↔ stepId mapping 1:1 terverifikasi. DIVERGENCES TERCATAT: DIV-001 (dual orchestration) + DIV-002 (AI branch behavior) = PREREQUISITE REMEDIATION sebelum Runtime Code dibuka. Runtime implementation TETAP LOCKED sampai remediation PRs merged → spec review LULUS formal.",
        lockedAreas: Object.freeze([
          "shared executionId RUNTIME implementation (code level) — LOCKED pending DIV-001 + DIV-002 remediation merge",
          "persisted state sync antara Workspace & Chat — LOCKED pending remediation",
          "state machine transition persistence (Gate 3 concern) — LOCKED dep. on Gate 2 PASS",
          "workflow-engine alternate prepare_release orchestration fork — HARUS DI-REFACTOR ke procedure delegation (DIV-001 remediation) BEFORE execution runtime code",
        ]),
      }),
      Object.freeze({
        order: 3,
        name: "Durable Evidence Store",
        status: STATUS.LOCKED,
        dependency: "Execution Identity proven (tahu execution ID apa yang menghasilkan evidence)",
        lockedAreas: Object.freeze([
          "auto-register procedure output ke evidence registry via Evidence Capability delegation",
          "evidence producer attribution via executionId",
          "audit trail immutable records",
        ]),
      }),
      Object.freeze({
        order: 4,
        name: "Continuation / Resume Engine",
        status: STATUS.LOCKED,
        dependency:
          "Durable Evidence proven (tahu state apa yang harus dilanjutkan dan apa evidence snapshot-nya)",
        lockedAreas: Object.freeze([
          "procedure resume() dari WAIT_FOR_AI_OR_HUMAN",
          "ai investigation result → state transition bridge",
          "state snapshot & restore",
        ]),
      }),
      Object.freeze({
        order: 5,
        name: "API / Worker / Agent Evaluation",
        status: STATUS.LOCKED,
        dependency: "All previous gates proven (runtime model fully established)",
        lockedAreas: Object.freeze([
          "apps/api development",
          "apps/worker development",
          "AI agent loops beyond current conditional fallback",
          "new DSL / schema beyond current procedure contracts",
        ]),
      }),
    ]),

    gatePrinciple:
      "Ini adalah dependency order, bukan roadmap. Tidak bisa skip. Gate 1 CLOSED → Gate 2 DESIGN OPEN (bukan implementation free-for-all). Gate 2 PASS baru dibuka implementation.",
  }),

  sevenQuestions: Object.freeze([
    Object.freeze({
      q: "1. EOS ini apa?",
      aKey: "identity.whatIsEos",
    }),
    Object.freeze({
      q: "2. Arsitekturnya bagaimana?",
      aKey: "architecture.boundaryRule + architecture.layers",
    }),
    Object.freeze({
      q: "3. Apa yang benar-benar sudah bisa dilakukan?",
      aKey: "capabilities.provenWork + evidence.provenRequirements",
    }),
    Object.freeze({
      q: "4. Procedure apa yang tersedia?",
      aKey: "procedures.active (prepare_release)",
    }),
    Object.freeze({
      q: "5. Saya bisa bekerja lewat surface mana?",
      aKey: "surfaces.surfaces (WORK + KNOW route lists)",
    }),
    Object.freeze({
      q: "6. Apa yang sudah terbukti?",
      aKey: "evidence.provenRequirements (REQ-001..008) + academic verification",
    }),
    Object.freeze({
      q: "7. Apa yang belum terbukti?",
      aKey: "evidence.frontierPending (FRONTIER-1..3) + gates.status",
    }),
  ]),
});

export type EOSKnowledgeModel = typeof EOS_KNOWLEDGE_MODEL;