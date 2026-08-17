import { EOS_KNOWLEDGE_MODEL, STATUS } from "../_lib/eos-knowledge-model.js";
import { StatusBadge } from "../_components/status-badge.js";
import { Section, SectionCard, LabeledRow } from "../_components/section.js";
import { PageHeader } from "../_components/navigation.js";

export default function StatePage() {
  const st = EOS_KNOWLEDGE_MODEL.state;
  const lif = st.procedureLifecycle;

  const HUMAN_MODE_LABEL = "Validation Stage 1 · KNOW Surface Acceptance";
  const INTERNAL_MODE_LABEL = "Controlled Engineering Mode";

  return (
    <div>
      <PageHeader
        kicker="Know · State"
        title="Procedure State Machine + Runtime Mode"
        subtitle="State procedure prepare_release + Controlled Engineering Mode saat ini."
      />

      {/* K5 — RUNTIME TERMINOLOGY DUAL-LABELING (human + internal) */}
      <Section eyebrow="Runtime Mode" title="Mode dan Scope Engineering Sekarang">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SectionCard className="border-purple-900/50 bg-purple-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Mode · Audience</p>
            <p className="text-purple-300 font-bold">{HUMAN_MODE_LABEL}</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Istilah internal: <span className="font-mono">{INTERNAL_MODE_LABEL}</span>
            </p>
          </SectionCard>
          <SectionCard className="border-sky-900/50 bg-sky-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Scope · Aktif</p>
            <p className="text-sky-300 font-semibold text-sm">{st.scope}</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Semua path lain: <span className="font-mono">🔒 LOCKED</span>
            </p>
          </SectionCard>
          <SectionCard className="border-emerald-900/50 bg-emerald-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Active Gate</p>
            <p className="text-emerald-300 font-semibold text-sm">{st.activeGate}</p>
          </SectionCard>
          <SectionCard className="border-amber-900/50 bg-amber-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Next Gate · Setelah Human Validation #3 Lulus</p>
            <p className="text-amber-300 font-semibold text-sm">{st.nextGate}</p>
          </SectionCard>
        </div>
        <p className="text-xs text-neutral-500 mt-4 italic">
          * Istilah <span className="font-mono">{INTERNAL_MODE_LABEL}</span> adalah governance internal untuk engineer.
          Bagi pembaca KNOW surface: ini artinya <strong>{HUMAN_MODE_LABEL}</strong>.
          Kita hanya fokus menyempurnakan surface ini sebelum membuka area engineering lain.
        </p>
      </Section>

      <Section eyebrow="Lifecycle" title={`${lif.name} — 6 States + Transisi`}>
        <div className="space-y-3">
          {lif.states.map((s, i) => {
            const isConditional = s.state === "trigger_ai_investigation";
            const isTerminal = s.state === "determine_final_posture";
            return (
              <div
                key={s.state}
                className={`relative p-4 rounded-lg border-l-4 ${
                  isTerminal
                    ? "border-sky-500 bg-sky-950/10 border-sky-900/50 border"
                    : isConditional
                      ? "border-amber-500 bg-amber-950/10 border-amber-900/50 border"
                      : "border-emerald-500 bg-neutral-900/40 border-neutral-800"
                }`}
              >
                {i < lif.states.length - 1 ? (
                  <div
                    aria-hidden
                    className="absolute left-[17px] top-full h-3 w-0.5 bg-neutral-700"
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="font-mono font-bold text-white">{s.state}</p>
                  {isConditional ? (
                    <StatusBadge status={STATUS.PARTIAL} />
                  ) : null}
                  {isTerminal ? (
                    <span className="text-xs font-mono px-2 py-1 rounded border border-sky-800 bg-sky-950/40 text-sky-300">
                      TERMINAL
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-neutral-300 mb-1">{s.description}</p>
                <p className="text-xs font-mono text-neutral-500">
                  → {s.transitionsTo}
                </p>
                {"aiRule" in s && s.aiRule ? (
                  <p className="text-xs text-amber-300/80 mt-2 italic">⚠️ {s.aiRule}</p>
                ) : null}
                {isConditional ? (
                  <p className="text-xs text-amber-400/80 mt-2 font-medium">
                    PARTIAL: branch trigger dan WAIT state proven; AI result + resume tidak proven.
                    Lihat breakdown detail di section AI Branch Evidence dibawah ↓
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      {/* K4 — AI STEP GRANULAR EVIDENCE BREAKDOWN (with id= anchor for deep link from procedures page) */}
      <Section
        id="ai-branch-evidence"
        eyebrow="AI Branch Evidence · Granular"
        title="trigger_ai_investigation — 4 Claims Terpisah (Tidak Semua Proven / Tidak Semua Not-Proven)"
      >
        <p className="text-xs text-neutral-500 mb-4 italic">
          Prinsip Evidence granular: Jangan katakan seluruh step = NOT_PROVEN. Katakan BAGIAN MANA yang proven, BAGIAN MANA yang belum.
          Data model men-support granularity ini; kita render sesuai bukti, bukan blanket claim.
        </p>
        <div className="space-y-3">
          {EOS_KNOWLEDGE_MODEL.aiStep.claims.map((c) => (
            <div
              key={c.claim}
              className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <p className="text-sm text-neutral-100 font-medium">{c.claim}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">{c.evidenceNote}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-4 italic">
          Prinsip EOS: AI = conditional capability di dalam SOP. Bukan mesin utama.
          Known → deterministic. Unknown → intelligence. Ambiguous → investigation. Risky → human. Verified → continue.
        </p>
      </Section>

      <Section eyebrow="Terminal States" title="3 Kemungkinan Hasil Akhir Procedure">
        <div className="grid md:grid-cols-3 gap-3">
          {lif.terminalStates.map((t) => (
            <SectionCard
              key={t.name}
              className={
                t.name === "ready"
                  ? "border-emerald-900/60"
                  : t.name === "blocked"
                    ? "border-red-900/60"
                    : "border-amber-900/60"
              }
            >
              <div className="flex items-center justify-between mb-2">
                <StatusBadge
                  status={
                    t.name === "ready"
                      ? STATUS.PROVEN
                      : t.name === "blocked"
                        ? STATUS.LOCKED
                        : STATUS.NOT_PROVEN
                  }
                />
                <code className="text-xs font-mono text-neutral-400">{t.name}</code>
              </div>
              <p className="text-sm text-neutral-300">{t.description}</p>
            </SectionCard>
          ))}
        </div>
      </Section>

      <Section eyebrow="Continuation Model" title="Resume dari WAIT_FOR_AI_OR_HUMAN = FUTURE GATE">
        <SectionCard className="border-red-900/50 bg-red-950/10">
          <LabeledRow
            label="Frontier 3"
            value={<StatusBadge status={STATUS.LOCKED} />}
          />
          <p className="text-sm text-neutral-200 leading-relaxed mt-3">
            {lif.continuationModel}
          </p>
          <p className="text-xs text-neutral-500 mt-3 italic">
            Harus buka Gate 3 (Durable Evidence) dahulu untuk bisa menyimpan snapshot
            state apa yang harus di-resume. Gate 3 sendiri butuh Gate 2 (Execution Identity).
          </p>
        </SectionCard>
      </Section>
    </div>
  );
}
