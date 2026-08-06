import { EOS_KNOWLEDGE_MODEL, type StatusValue } from "../_lib/eos-knowledge-model";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";

export default function EvidencePage() {
  const ev = EOS_KNOWLEDGE_MODEL.evidence;

  return (
    <div>
      <PageHeader
        kicker="Know · Evidence"
        title="Evidence Registry — Yang Terbukti vs Yang Belum"
        subtitle="Bukti harus berasal dari file registry. Output procedure ≠ evidence durable (prinsip non-self-proven)."
      />

      <Section eyebrow="Principle" title="Hukum Evidence — Anti Self-Proven Circular Claims">
        <SectionCard className="border-emerald-900/50">
          <p className="text-neutral-200 leading-relaxed">{ev.evidencePrinciple}</p>
        </SectionCard>
      </Section>

      {/* K2 — EVIDENCE CONTEXT: ACADEMIC vs RELEASE READINESS TRACE CHAIN */}
      <Section eyebrow="Evidence Context" title={EOS_KNOWLEDGE_MODEL.evidenceContext.title}>
        <SectionCard className="border-amber-900/40 bg-amber-950/5 mb-4">
          <p className="text-neutral-200 text-sm leading-relaxed">
            {EOS_KNOWLEDGE_MODEL.evidenceContext.summary}
          </p>
        </SectionCard>
        <div className="space-y-3">
          {EOS_KNOWLEDGE_MODEL.evidenceContext.chain.map((l: Record<string,string>) => (
            <div
              key={l.layer}
              className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sky-300 font-mono font-bold text-xs uppercase tracking-wider">
                    {l.layer}
                  </p>
                  <p className="text-sm text-neutral-200 mt-1 leading-relaxed">{l.content}</p>
                </div>
                <StatusBadge status={l.status as StatusValue} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Academic Verification" title="Academic Community Slice — 4/4 Functional Test PASS">
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <SectionCard className="border-emerald-900/60 text-center">
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Functional Tests
            </p>
            <p className="text-2xl font-bold text-emerald-300">
              {ev.academicVerification.functionalTests}
            </p>
          </SectionCard>
          <SectionCard className="border-sky-900/60 text-center">
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Capability Reuse Ratio
            </p>
            <p className="text-2xl font-bold text-sky-300">
              {ev.academicVerification.capabilityReuseRatio}
            </p>
          </SectionCard>
          <SectionCard className="border-amber-900/60 text-center">
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Proven Requirements
            </p>
            <p className="text-2xl font-bold text-amber-300">
              {ev.provenRequirements.length} / {ev.provenRequirements.length}
            </p>
          </SectionCard>
        </div>
        <LabeledRow
          label="Evidence Sources"
          value={
            <ul className="space-y-1">
              {ev.academicVerification.evidenceSources.map((p) => (
                <li key={p}>
                  <code className="text-xs text-sky-300">{p}</code>
                </li>
              ))}
            </ul>
          }
        />
      </Section>

      <Section eyebrow="Proven Requirements" title={`REQ-001 s/d REQ-008 — ✅ Semua PROVEN`}>
        <div className="space-y-3">
          {ev.provenRequirements.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-lg border border-emerald-900/40 bg-emerald-950/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <code className="text-emerald-400 font-mono font-bold text-sm">
                    {r.id}
                  </code>
                  <p className="text-sm text-neutral-200 mt-1 leading-relaxed">
                    {r.description}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1.5">
                Evidence files
              </p>
              <ul className="space-y-0.5">
                {r.evidencePaths.map((p) => (
                  <li key={p}>
                    <code className="text-xs text-sky-300">{p}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Frontier Pending"
        title="3 Frontier Yang BELUM TERBUKTI — Tidak Boleh Diskip"
      >
        <div className="space-y-3">
          {ev.frontierPending.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-lg border border-red-900/40 bg-red-950/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <code className="text-red-400 font-mono font-bold text-sm">
                    {r.id}
                  </code>
                  <h3 className="text-white font-semibold mt-1">{r.name}</h3>
                  <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                    {r.description}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-600">
                Evidence paths: (belum ada — gate dependency belum terbuka)
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Summary" title="Perbandingan — Proven vs Pending">
        <div className="grid sm:grid-cols-2 gap-3">
          <SectionCard className="border-emerald-900/60">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2">
              PROVEN · Verified Requirements
            </p>
            <ul className="space-y-1 text-sm text-neutral-300">
              {ev.provenRequirements.map((r) => (
                <li key={r.id}>
                  <code className="text-emerald-400">{r.id}</code> — {r.description.slice(0, 50)}…
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard className="border-red-900/60">
            <p className="text-xs font-mono uppercase tracking-wider text-red-400 mb-2">
              NOT PROVEN · Frontier Gates
            </p>
            <ul className="space-y-1 text-sm text-neutral-300">
              {ev.frontierPending.map((r) => (
                <li key={r.id}>
                  <code className="text-red-400">{r.id}</code> — {r.name}
                </li>
              ))}
              <li className="text-xs text-neutral-500 mt-2">
                + Execution Identity gate = bagian dari Frontier 1 lifecycle
              </li>
            </ul>
          </SectionCard>
        </div>
      </Section>
    </div>
  );
}
