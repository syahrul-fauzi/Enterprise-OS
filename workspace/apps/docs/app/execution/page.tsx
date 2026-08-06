import {
  EOS_KNOWLEDGE_MODEL,
  STATUS,
  EXECUTION_MODEL_V1,
  type ExecutionAuditFieldValidation,
  type ExecutionLifecycleStateMapping,
  type ExecutionArchitecturalDivergence,
} from "../_lib/eos-knowledge-model";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";

export default function ExecutionDesignPage() {
  const ex = EXECUTION_MODEL_V1;
  const em = EOS_KNOWLEDGE_MODEL.executionModel;
  const frontier = EOS_KNOWLEDGE_MODEL.evidence.frontierPending.find(
    (f) => f.id === "FRONTIER-1"
  )!;
  const gates = EOS_KNOWLEDGE_MODEL.gates.gates;
  const g2 = gates.find((g) => g.order === 2)!;

  const HUMAN_MODE_LABEL = "Phase 2 · Execution Identity Design";
  const INTERNAL_MODE_LABEL = "Gate 2 OPEN — Design Phase";

  return (
    <div>
      <PageHeader
        kicker="Gate 2 · Execution Identity Design Spec"
        title="Canonical Execution Model V1 — Apa Itu Pekerjaan Yang Sedang Dijalankan Dalam EOS?"
        subtitle="Definition-only page. Spec ini menjawab 4 pertanyaan arsitektural sebelum satu baris code runtime execution diimplementasikan. Scope: DESIGN, BUKAN coding."
      />

      <Section
        eyebrow="Gate Status"
        title="Gate 2 — Execution Identity: DESIGN PHASE OPEN (bukan implementation free-for-all)"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SectionCard className="border-emerald-900/60 bg-emerald-950/5">
            <p className="text-xs font-mono text-neutral-500 mb-1">Mode</p>
            <p className="text-emerald-300 font-bold">{HUMAN_MODE_LABEL}</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              ({INTERNAL_MODE_LABEL})
            </p>
          </SectionCard>
          <SectionCard className="border-sky-900/60 bg-sky-950/5">
            <p className="text-xs font-mono text-neutral-500 mb-1">Model Status</p>
            <StatusBadge status={em.status} />
            <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{em.scope}</p>
          </SectionCard>
          <SectionCard className="border-amber-900/60 bg-amber-950/5">
            <p className="text-xs font-mono text-neutral-500 mb-1">Frontier Status</p>
            <StatusBadge status={frontier.status} />
            <p className="text-xs text-neutral-500 mt-2">
              Specification PASS → runtime code → Gate 2 Close.
            </p>
          </SectionCard>
          <SectionCard className="border-red-900/60 bg-red-950/5">
            <p className="text-xs font-mono text-neutral-500 mb-1">Runtime Implementation</p>
            <StatusBadge status={STATUS.LOCKED} />
            <p className="text-xs text-neutral-500 mt-2">
              Spec review dulu, BARU boleh mulai coding.
            </p>
          </SectionCard>
        </div>
        {g2.lockedAreas ? (
          <div className="mt-5 p-3 rounded-md border border-red-900/50 bg-red-950/10">
            <p className="text-xs font-semibold text-red-300 mb-1">
              🚫 IMPLEMENTASI YANG MASIH LOCKED (belum boleh code):
            </p>
            <ul className="list-disc list-inside text-xs text-red-200/90 space-y-0.5">
              {g2.lockedAreas.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      {/* ========== Q1 — APA ITU EXECUTION? ========== */}
      <Section
        eyebrow="Q1 · Definition"
        title="Apa itu Execution? 9 Field Minimum — Semuanya Evidence-Derived"
      >
        <SectionCard className="border-sky-900/40 mb-4">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Execution adalah <strong>satu kejadian nyata</strong> ketika sebuah Procedure
            dijalankan <strong>atas sebuah Subject domain tertentu</strong> (misal
            releaseId EOS-003). Semua 9 field di bawah ini diambil BUKAN dari khayalan —
            masing-masing berasal dari apa yang SUDAH ada di procedure I/O contract
            EOS hari ini.
          </p>
        </SectionCard>

        <div className="space-y-3">
          {ex.fields.map((f, i) => (
            <div
              key={f.field}
              className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-mono text-sky-400 mb-1">
                    Field {i + 1}{" "}
                    {f.required ? (
                      <span className="text-red-400">* REQUIRED</span>
                    ) : (
                      <span className="text-neutral-500">optional</span>
                    )}
                  </p>
                  <p className="font-semibold text-white font-mono">{f.field}</p>
                  <p className="text-xs text-neutral-400 mt-1">Type: {f.type}</p>
                </div>
                <StatusBadge
                  status={f.required ? STATUS.PROVEN : STATUS.PARTIAL}
                />
              </div>
              <div className="space-y-1.5 mt-3 pt-3 border-t border-neutral-800">
                <p className="text-xs text-neutral-300">
                  <span className="font-semibold text-sky-300">Bukti (mengapa harus ada):</span>{" "}
                  {f.evidence}
                </p>
                <p className="text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-400">
                    Diambil dari apa yang sudah ada:
                  </span>{" "}
                  {f.derivedFromToday}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ========== Q1.5 · EXPLICITLY LOCKED FIELDS (GATE 2 SCOPE STOP) ========== */}
      <Section
        eyebrow="Q1.5 · Explicitly LOCKED — BUKAN Scope Gate 2"
        title="6 Fields LOCKED untuk Future Gates — Jangan Menyelundup sebelum Pass Remediation + Review"
      >
        <SectionCard className="border-red-900/60 bg-red-950/5 mb-5">
          <p className="text-sm text-red-200 leading-relaxed">
            <strong className="text-red-300">STOP LINE.</strong> 6 field di bawah ini <strong>DILARANG</strong> masuk ke scope minimum Gate 2.
            Mekanisme-mekanisme ini adalah Gate 3 (Durable Evidence) dan Gate 4 (Continuation) concern.
            Gate 2 scope berhenti di 5 fields minimum.
          </p>
        </SectionCard>

        <div className="grid md:grid-cols-2 gap-3">
          {ex.futureLockedFields.map((f) => (
            <div
              key={f.field}
              className="p-4 rounded-lg border border-red-900/40 bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p className="font-mono text-red-300 font-semibold">🔒 {f.field}</p>
                <StatusBadge status={STATUS.LOCKED} />
              </div>
              <p className="text-xs text-neutral-400 mb-1">
                <span className="font-semibold text-neutral-300">Scope Gate Depan:</span> {f.type}
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {f.evidence}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ========== Q1-3 · AUDIT VALIDATION PER-FIELD ========== */}
      <Section
        eyebrow="Q1-3 · Audit Validation"
        title="Per-Field Audit Status: 5 Scope Field PROVEN, 3 Locked NOT PROVEN (Future Gates)"
      >

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-950/80">
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-sky-300">
                  Field
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-emerald-300">
                  Audit Status
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-neutral-300">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {ex.auditValidation.map((v: ExecutionAuditFieldValidation) => (
                <tr key={v.field}>
                  <td className="border border-neutral-800 px-3 py-2 font-mono text-neutral-200 font-semibold whitespace-nowrap">
                    {v.field}
                  </td>
                  <td className="border border-neutral-800 px-3 py-2">
                    <StatusBadge
                      status={v.auditVerified ? STATUS.PROVEN : STATUS.NOT_PROVEN}
                    />
                  </td>
                  <td className="border border-neutral-800 px-3 py-2 text-xs text-neutral-400 leading-relaxed">
                    {v.note ?? v.verifiedIn.join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ========== Q1-ter · LIFECYCLE ↔ STEP MAPPING ========== */}
      <Section
        eyebrow="Q1-ter · State ↔ Step Mapping"
        title="6 Lifecycle State ↔ 6 StepId: 1:1 Correspondence Ter-verifikasi"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-950/80">
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-sky-300">
                  Lifecycle State (docs)
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-purple-300">
                  StepId (code)
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-emerald-300">
                  currentState value
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-neutral-300">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody>
              {ex.lifecycleStepMapping.map(
                (m: ExecutionLifecycleStateMapping) => (
                  <tr key={m.lifecycleState}>
                    <td className="border border-neutral-800 px-3 py-2 font-mono text-neutral-200 whitespace-nowrap">
                      {m.lifecycleState}
                    </td>
                    <td className="border border-neutral-800 px-3 py-2 font-mono text-purple-300 whitespace-nowrap">
                      {m.mapsToStepId}
                    </td>
                    <td className="border border-neutral-800 px-3 py-2 font-mono text-emerald-300 whitespace-nowrap">
                      {m.mapsToCurrentState}
                    </td>
                    <td className="border border-neutral-800 px-3 py-2">
                      <StatusBadge
                        status={m.observedInProcedure ? STATUS.PROVEN : STATUS.NOT_PROVEN}
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500 mt-4 italic">
          Intermediate states (validate_inputs..assess_evidence) = currentState = running.intermediate.
          Conditional WAIT state (trigger_ai_investigation) = waiting.ai_or_human.
          Terminal (determine_final_posture) = currentState = terminal dengan outcome = ready/blocked/pending_ai.
        </p>
      </Section>

      {/* ========== Q2 — BOUNDARY IDENTITY: executionKey = correlation, executionId = future ========== */}
      <Section
        eyebrow="Q2 · executionKey ↔ executionId: Dua Jenis Identitas Berbeda"
        title="executionKey = Stable Correlation. executionId = Instance Identity (LOCKED untuk Future Gate)."
      >
        <SectionCard className="border-amber-900/50 bg-amber-950/5 mb-5">
          <p className="text-sm text-amber-200 leading-relaxed">
            <strong className="text-amber-300">GATEKEEPER CORRECTION VITAL.</strong>
            Formula <code className="bg-neutral-950 px-1.5 py-0.5 rounded font-mono text-xs">procedure:subject</code> adalah
            <strong> executionKey</strong> — jawaban atas pertanyaan manusia:{" "}
            <em>"pekerjaan yang saya lihat ini sebenarnya pekerjaan yang mana?"</em>. Ini BUKAN <code className="font-mono">executionId</code>.
            Perbedaan semantik: pekerjaan yang sama (key sama) bisa dijalankan berkali-kali (10:00, 11:00, 14:00) →
            instance identity mana = Gate 3/4 concern, JANGAN diselundupkan ke Gate 2.
          </p>
        </SectionCard>

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <SectionCard className="border-emerald-900/60">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2">
              KITA MAU (Model V1)
            </p>
            <p className="text-white font-semibold mb-2">Formula:</p>
            <pre className="bg-neutral-950 border border-neutral-800 p-3 rounded overflow-x-auto text-xs font-mono text-emerald-300">
{ex.identity.formula}
            </pre>
            <p className="text-xs text-neutral-400 mt-3 mb-1">Contoh:</p>
            <pre className="bg-neutral-950 border border-neutral-800 p-3 rounded overflow-x-auto text-xs font-mono text-white">
{ex.identity.example}
            </pre>
          </SectionCard>
          <SectionCard className="border-red-900/60">
            <p className="text-xs font-mono uppercase tracking-wider text-red-400 mb-2">
              YANG KITA TOLAK (Hari Ini)
            </p>
            <pre className="bg-neutral-950 border border-neutral-800 p-3 rounded overflow-x-auto text-xs font-mono text-red-300 line-clamp-6">
Workspace = uuid-A
Chat      = uuid-B
            </pre>
            <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
              Non-example: {ex.identity.nonExample}
            </p>
          </SectionCard>
        </div>

        <SectionCard className="border-neutral-800">
          <p className="text-white font-semibold mb-1">Rule identity boundary:</p>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {ex.identity.rule}
          </p>
          <p className="text-xs text-neutral-500 mt-3 italic leading-relaxed">
            Rationale filosofis: {ex.identity.rationale}
          </p>
        </SectionCard>
      </Section>

      {/* ========== Q3 — EXECUTION vs PROCEDURE ========== */}
      <Section
        eyebrow="Q3 · Boundary Execution ↔ Procedure"
        title="Procedure = Bagaimana. Execution = Kejadian Nyata Untuk Subject Ini Sekarang."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-950/80">
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-sky-300">
                  Concern
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-purple-300">
                  Procedure
                </th>
                <th className="border border-neutral-800 px-3 py-2 text-left font-semibold text-emerald-300">
                  Execution
                </th>
              </tr>
            </thead>
            <tbody>
              {ex.procedureVsExecution.map((r) => (
                <tr key={r.concern}>
                  <td className="border border-neutral-800 px-3 py-2 text-neutral-200 font-semibold whitespace-nowrap">
                    {r.concern}
                  </td>
                  <td className="border border-neutral-800 px-3 py-2 text-neutral-300 leading-relaxed">
                    {r.procedure}
                  </td>
                  <td className="border border-neutral-800 px-3 py-2 text-neutral-300 leading-relaxed">
                    {r.execution}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500 mt-4 italic">
          Kesimpulan: Procedure adalah template; Execution adalah instantiation template
          tersebut untuk subject nyata pada waktu nyata. Procedure tidak punya state.
          Execution adalah first-class stateful runtime object.
        </p>
      </Section>

      {/* ========== Q3-bis · ARCHITECTURAL DIVERGENCES ========== */}
      <Section
        eyebrow="Q3-bis · Architectural Divergences"
        title="Temuan Audit Kritis: 4 Divergensi yang Harus Diperbaiki Sebelum Runtime Code"
      >
        <SectionCard className="border-red-900/50 bg-red-950/5 mb-5">
          <p className="text-sm text-red-200 leading-relaxed">
            <strong className="text-red-300">Gate Blocker Alert.</strong> Dua divergensi (DIV-001 + DIV-002) adalah{" "}
            <strong>PREREQUISITE REMEDIATION</strong>. Artinya: runtime code Execution Identity TIDAK BOLEH
            dimulai sebelum kedua issue ini di-fix via single orchestration refactor.
            Tanpa remediation ini, Workspace, Chat, dan Workflow Engine akan menghasilkan state TIDAK SINKRON
            meskipun memanggil procedure "yang sama" untuk subject yang sama.
          </p>
        </SectionCard>

        <div className="space-y-4">
          {ex.architecturalDivergences.map(
            (div: ExecutionArchitecturalDivergence) => (
              <div
                key={div.id}
                className={`p-4 rounded-lg border-l-4 ${
                  div.severity === "critical"
                    ? "border-red-500 bg-neutral-900/40 border-red-900/50 border"
                    : div.severity === "high"
                      ? "border-orange-500 bg-neutral-900/40 border-orange-900/50 border"
                      : div.severity === "medium"
                        ? "border-amber-500 bg-neutral-900/40 border-amber-900/50 border"
                        : "border-sky-500 bg-neutral-900/40 border-neutral-800 border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {div.id}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        div.severity === "critical"
                          ? "bg-red-950/60 text-red-300 border border-red-800"
                          : div.severity === "high"
                            ? "bg-orange-950/60 text-orange-300 border border-orange-800"
                            : div.severity === "medium"
                              ? "bg-amber-950/60 text-amber-300 border border-amber-800"
                              : "bg-sky-950/60 text-sky-300 border border-sky-800"
                      }`}
                    >
                      {div.severity}
                    </span>
                    {div.gateBlocker ? (
                      <StatusBadge status={STATUS.LOCKED} />
                    ) : null}
                    <h3 className="font-semibold text-white">{div.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed mb-3">
                  {div.description}
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-neutral-950/60 border border-neutral-800">
                    <p className="text-xs font-semibold text-purple-300 mb-1">
                      Architectural Impact
                    </p>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {div.architecturalImpact}
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-neutral-950/60 border border-neutral-800">
                    <p className="text-xs font-semibold text-emerald-300 mb-1">
                      Remediation Plan
                    </p>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {div.remediation}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-neutral-600 mt-3 leading-relaxed">
                  Evidence paths: {div.evidencePaths.join(" · ")}
                </p>
              </div>
            )
          )}
        </div>
      </Section>

      {/* ========== Q4 — DURABLE (5 Fields Scope Gate 2) vs LOCKED (6 Fields Future Gate) ========== */}
      <Section
        eyebrow="Q4 · Durable Scope Gate 2"
        title="Anti Persistence-Monster: 5 Fields SCOPE GATE 2 Minimum. 6 Fields = EXPLICITLY LOCKED."
      >
        <SectionCard className="border-emerald-900/50 bg-emerald-950/5 mb-5">
          <p className="font-semibold text-emerald-300 mb-2">
            ✅ Minimum Must Survive (Scope Gate 2 — 5 fields SAJA):
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {ex.durable.minimumMustSurvive.map((f, i) => (
              <div
                key={f}
                className="p-3 rounded-md bg-neutral-950/60 border border-neutral-800"
              >
                <p className="text-xs text-neutral-500">#{i + 1}</p>
                <p className="text-sm font-mono font-semibold text-emerald-300">
                  {f}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
            {ex.durable.rationale}
          </p>
          <p className="text-[11px] font-mono text-emerald-400 mt-2 border-t border-emerald-900/40 pt-2 leading-relaxed">
            {ex.durable.gate2ScopeNote}
          </p>
        </SectionCard>

        <SectionCard className="border-red-900/50 bg-red-950/5">
          <p className="font-semibold text-red-300 mb-2">
            🔒 EXPLICITLY LOCKED (Gate 3/4 concern — BUKAN scope Gate 2 sekarang):
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ex.durable.explicitlyLockedInGate2.map((f) => (
              <div
                key={f}
                className="p-3 rounded-md bg-neutral-950/60 border border-red-900/40"
              >
                <p className="text-sm font-mono font-semibold text-red-300">
                  🔒 {f}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-3 italic leading-relaxed">
            {ex.durable.ephemeralRationale}
          </p>
        </SectionCard>
      </Section>

      {/* ========== CANONICAL EXAMPLE — GATE 2 SCOPE VERSION (5 fields ONLY) ========== */}
      <Section
        eyebrow="Canonical Instance — Gate 2 Scope"
        title="Contoh Execution Identity V1 — HANYA 5 Fields. Tidak Ada executionId. Tidak Ada Outcome."
      >
        <SectionCard>
          <pre className="bg-neutral-950 border border-neutral-800 p-4 rounded overflow-x-auto text-xs font-mono leading-relaxed text-white">
{`// FIRST-CLASS EOS EXECUTION IDENTITY (GATE 2 SCOPE — 5 fields SAJA)
const executionIdentity = {
  executionKey:  "${ex.canonicalExample.executionKey}",
  procedure:     "${ex.canonicalExample.procedure}",
  subject:       { releaseId: "${ex.canonicalExample.subject.releaseId}" },
  currentState:  "${ex.canonicalExample.currentState}",
  currentStep:   "${ex.canonicalExample.currentStep}",
};

// LEVERAGE UTAMA: Workspace ↔ Chat Menunjuk KE PEKERJAAN YANG SAMA
//
// Scenario Manusia Nyata:
//
// 1. Buka Workspace → Release Readiness → pilih EOS-003
//    → Compute executionKey = "prepare_release:release/EOS-003"
//    → currentStep = "trigger-ai-investigation", state = WAIT
//
// 2. Buka Chat → tanya: "Bagaimana status release EOS-003?"
//    → Intent parser extract releaseId = EOS-003
//    → Compute executionKey = "prepare_release:release/EOS-003"
//    → Chat MENDAPATKAN executionIdentity YANG SAMA = step WAIT AI
//
// HASIL: Dua Surface BUKAN dua aplikasi.
// Mereka adalah 2 KONTROL SURFACE untuk SATU PEKERJAAN EOS YANG SAMA. ✅
//
// ------------------------------------------------------------------
// 🔒 FIELDS YANG TIDAK ADA DISINI — BUKAN scope Gate 2 (sengaja dikosongkan):
//    executionId     — instance "run 10:00 vs 14:00"     = future gate
//    inputSnapshot   — full snapshot optional             = beyond scope
//    outcome         — ready/blocked/pending_ai           = derivable dari rerun
//    evidenceRefs    — registry write attribution         = Gate 3
//    pendingActions  — action dequeue/resume              = Gate 4
//    continuationKey — resume checkpoint                  = Gate 4
// ------------------------------------------------------------------`}
          </pre>
        </SectionCard>
      </Section>

      {/* ========== WHAT THIS IS NOT + REMEDIATION STOP LINE ========== */}
      <Section
        eyebrow="Scope Control"
        title="Gate 2 Remediation Scope = DIV-001 + DIV-002 SAJA. Semua yang Lain = STOP LINE."
      >
        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <SectionCard className="border-red-900/50 bg-red-950/5">
            <p className="text-xs font-mono uppercase text-red-400 mb-1">
              ✅ BUKA — DIV-001
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Single Orchestration SSoT: Refactor workflow-engine executePrepareRelease() → delegasi ke prepareReleaseProcedure() YANG SAMA.
            </p>
          </SectionCard>
          <SectionCard className="border-amber-900/50 bg-amber-950/5">
            <p className="text-xs font-mono uppercase text-amber-400 mb-1">
              ✅ BUKA — DIV-002
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Normalize AI branch semantics. Procedure = branch condition + required-action mark. Execution = kapan/how dispatch.
            </p>
          </SectionCard>
          <SectionCard className="border-emerald-900/50 bg-emerald-950/5">
            <p className="text-xs font-mono uppercase text-emerald-400 mb-1">
              🛑 STOP — ALL OTHERS
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Setelah DIV-001 + DIV-002 merged: BERHENTI. Jangan lanjut ke runtime code sebelum Gate 2 review PASS.
            </p>
          </SectionCard>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <SectionCard className="border-red-900/50 bg-red-950/5">
            <p className="text-xs font-mono uppercase text-red-400 mb-2">
              ❌ DILARANG — Scope Creep Melewati STOP LINE
            </p>
            <ul className="space-y-1.5 text-xs text-neutral-300 leading-relaxed">
              <li>• ExecutionRepository / database / persistence execution</li>
              <li>• Random executionId UUID / attempt id per call</li>
              <li>• Resume / continuation / checkpointing</li>
              <li>• Durable evidence write attribution (Gate 3)</li>
              <li>• Worker / apps/api / CLI / capability baru</li>
              <li>• AI continuation loop / dispatch agent sekarang</li>
              <li>• Mengubah prepare_release contract signature</li>
            </ul>
          </SectionCard>
          <SectionCard className="border-neutral-800">
            <p className="text-xs font-mono uppercase text-neutral-400 mb-2">
              📐 Prinsip Pengendali Scope EOS V1
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed mb-3">
              <em>Definisikan dahulu identitas. Jangan mengimplementasikan dahulu lalu cari identitasnya.</em>
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed">
              DIV-001 + DIV-002 remediasi = memastikan definisi procedure execution = single semantic. Setelah remediation selesai + verified: KEMBALI ke Gatekeeper Review. HANYA setelah PASS review → define smallest runtime slice → Execution Identity implementation → STOP. Gate 3 Durable Evidence menunggu Gate 2 Close.
            </p>
          </SectionCard>
        </div>
      </Section>
    </div>
  );
}
