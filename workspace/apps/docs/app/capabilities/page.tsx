import { EOS_KNOWLEDGE_MODEL, STATUS, type CapabilityItem, type StatusValue } from "../_lib/eos-knowledge-model";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";

const STABILITY: Record<"stable" | "experimental", StatusValue> = {
  stable: STATUS.STABLE,
  experimental: STATUS.EXPERIMENTAL,
};

function statusDot(status: string) {
  const m: Record<string, string> = {
    PASS: "text-emerald-400",
    NOT_APPLICABLE: "text-neutral-500",
    UNVERIFIED: "text-amber-400",
  };
  return m[status] ?? "text-neutral-400";
}

export default function CapabilitiesPage() {
  const caps = EOS_KNOWLEDGE_MODEL.capabilities;
  const summary = caps.certificationSummary;

  return (
    <div>
      <PageHeader
        kicker="Know · Capabilities"
        title="16 Capability Registry — Proven Work + Certification Status"
        subtitle="Semua 16 kemampuan terdaftar di registry. Status certification = PARTIAL (performance evidence belum terdaftar untuk apapun)."
      />

      <Section eyebrow="Snapshot" title="Certification Summary dari Registry">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <SummaryStat label="Total" value={summary.totalCapabilities.toString()} tone="neutral" />
          <SummaryStat label="Stable" value={summary.stableCapabilities.toString()} tone="sky" />
          <SummaryStat label="Experimental" value={summary.experimentalCapabilities.toString()} tone="amber" />
          <SummaryStat label="Partial" value={summary.partialCapabilities.toString()} tone="amber" />
          <SummaryStat label="Certified" value={summary.certifiedCapabilities.toString()} tone="red" />
          <SummaryStat label="Performance Evidence" value={summary.performanceEvidenceAvailable.toString()} tone="red" />
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          Registry source:{" "}
          <code className="text-sky-400">{summary.registrySource}</code>
        </p>
      </Section>

      <Section eyebrow="Proven Work" title="End-to-End Work yang Benar-Benar Sudah Bisa Dilakukan">
        <div className="grid md:grid-cols-2 gap-4">
          {caps.provenWork.map((w) => {
            const any = w as Record<string, string>;
            return (
              <SectionCard key={w.name} className="border-emerald-900/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{w.name}</h3>
                  <StatusBadge status={w.status} />
                </div>
                {any.testsPassed ? (
                  <LabeledRow label="Functional Test" value={any.testsPassed} />
                ) : null}
                {any.reuseRatio ? (
                  <LabeledRow label="Reuse Ratio" value={any.reuseRatio} />
                ) : null}
                {any.coverage ? (
                  <LabeledRow label="Coverage" value={any.coverage} />
                ) : null}
                <LabeledRow
                  label="Evidence"
                  value={<code className="text-xs text-sky-300">{w.evidence}</code>}
                />
              </SectionCard>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Registry" title="16 Capabilities — Status Per Kriteria">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-800">
                <th className="py-2 pr-3 font-mono text-xs">ID</th>
                <th className="py-2 pr-3 font-mono text-xs">Stability</th>
                <th className="py-2 pr-3 font-mono text-xs">Certification</th>
                <th className="py-2 pr-3 font-mono text-xs">Dependency</th>
                <th className="py-2 pr-3 font-mono text-xs">Contract</th>
                <th className="py-2 pr-3 font-mono text-xs">Provider</th>
                <th className="py-2 pr-3 font-mono text-xs">Compat</th>
                <th className="py-2 pr-3 font-mono text-xs">Performance</th>
              </tr>
            </thead>
            <tbody>
              {caps.registry.map((c: CapabilityItem) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-900/40"
                >
                  <td className="py-2 pr-3 font-mono text-neutral-200">{c.id}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={STABILITY[c.stability]} />
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge
                      status={c.certificationStatus as StatusValue}
                    />
                  </td>
                  <td className={`py-2 pr-3 font-mono text-xs ${statusDot(c.dependencyValid)}`}>
                    {c.dependencyValid}
                  </td>
                  <td className={`py-2 pr-3 font-mono text-xs ${statusDot(c.contractValid)}`}>
                    {c.contractValid}
                  </td>
                  <td className={`py-2 pr-3 font-mono text-xs ${statusDot(c.providerValid)}`}>
                    {c.providerValid}
                  </td>
                  <td className={`py-2 pr-3 font-mono text-xs ${statusDot(c.compatibilityValid)}`}>
                    {c.compatibilityValid}
                  </td>
                  <td className={`py-2 pr-3 font-mono text-xs ${statusDot(c.performanceValid)}`}>
                    {c.performanceValid}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500 mt-3 italic">
          Performance Valid = UNVERIFIED untuk semua. Ini alasan mengapa semua capability
          tetap PARTIAL. Performance evidence registry adalah FUTURE GATE.
        </p>
      </Section>

      <Section
        eyebrow="Locked Areas · Scope Saat Ini"
        title="Area yang DITUTUP — Tidak Boleh Dikerjakan Sampai Dependency Gate Proven"
      >
        <p className="text-xs text-neutral-500 mb-4 italic">
          * Internal governance menyebut mode ini <span className="font-mono">Controlled Engineering Mode</span>.
          Artinya secara sederhana: <strong>hanya KNOW Surface yang sedang kita fokuskan untuk validasi manusia saat ini</strong>.
          Area lain diblokir agar tidak ada technical debt diatas fondasi yang berubah.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {caps.lockedItems.map((l) => (
            <div
              key={l.name}
              className="p-4 rounded-lg border border-red-900/50 bg-red-950/10"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{l.name}</span>
                <StatusBadge status={STATUS.LOCKED} />
              </div>
              <p className="text-xs text-red-300/80">Reason: {l.reason}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "sky" | "amber" | "red";
}) {
  const map = {
    neutral: "border-neutral-800",
    sky: "border-sky-900/60 bg-sky-950/10",
    amber: "border-amber-900/60 bg-amber-950/10",
    red: "border-red-900/60 bg-red-950/10",
  } as const;
  const text = {
    neutral: "text-neutral-300",
    sky: "text-sky-300",
    amber: "text-amber-300",
    red: "text-red-300",
  } as const;
  return (
    <div className={`p-3 rounded-lg border ${map[tone]} text-center`}>
      <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${text[tone]}`}>{value}</p>
    </div>
  );
}