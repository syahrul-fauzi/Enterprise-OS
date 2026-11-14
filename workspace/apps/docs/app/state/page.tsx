import { getRuntimeState } from "../_lib/registry-client";
import { STATUS } from "../_lib/eos-knowledge-model";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";
import { DataSourceBadge } from "../_components/data-source-badge";

export default function StatePage() {
  const { data: st, dataSource } = getRuntimeState();
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

      <DataSourceBadge dataSource={dataSource} />

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

      <Section eyebrow="Lifecycle" title={`${lif.name} — ${lif.states.length} States + Transisi`}>
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

      <Section eyebrow="Terminal States" title={`${lif.name} — ${lif.terminalStates.length} Terminal States`}>
        <div className="grid md:grid-cols-3 gap-3">
          {lif.terminalStates.map((ts) => (
            <SectionCard key={ts.name} className="border-neutral-800">
              <p className="font-mono font-bold text-white mb-1">{ts.name}</p>
              <p className="text-sm text-neutral-300">{ts.description}</p>
            </SectionCard>
          ))}
        </div>
      </Section>

      <Section eyebrow="Continuation Model" title="Continuation Model">
        <SectionCard className="border-sky-900/50 bg-sky-950/10">
          <p className="text-sm text-neutral-200 leading-relaxed">
            {lif.continuationModel}
          </p>
        </SectionCard>
      </Section>
    </div>
  );
}