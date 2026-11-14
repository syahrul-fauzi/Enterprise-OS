import { getCapabilityRegistry, getCertificationSummary } from "../_lib/registry-client";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";
import { STATUS, type StatusValue } from "../_lib/eos-knowledge-model";

function getStabilityBadge(stability: string | undefined): StatusValue {
  switch (stability) {
    case 'stable':
      return STATUS.STABLE;
    case 'experimental':
      return STATUS.EXPERIMENTAL;
    default:
      return STATUS.UNVERIFIED;
  }
}

function getGovernanceStatusBadge(status: string): StatusValue {
  switch (status) {
    case 'VALID':
      return STATUS.PROVEN;
    case 'INVALID':
      return STATUS.NOT_PROVEN;
    default:
      return STATUS.UNVERIFIED;
  }
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const toneClasses: Record<string, string> = {
    neutral: "border-neutral-800 bg-neutral-900/40",
    sky: "border-sky-900/50 bg-sky-950/10",
    amber: "border-amber-900/50 bg-amber-950/10",
    red: "border-red-900/50 bg-red-950/10",
    emerald: "border-emerald-900/50 bg-emerald-950/10",
  };
  return (
    <div className={`p-4 rounded-lg border ${toneClasses[tone] || toneClasses.neutral}`}>
      <p className="text-xs font-mono uppercase text-neutral-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function CapabilitiesPage() {
  const registry = getCapabilityRegistry();
  const summary = getCertificationSummary(registry);

  return (
    <div>
      <PageHeader
        kicker="Know · Capabilities"
        title={`${summary.totalCapabilities} Capability Registry — Proven Work + Certification Status`}
        subtitle={`Semua ${summary.totalCapabilities} kemampuan terdaftar di registry. Status certification diambil secara dinamis dari laporan audit runtime.`}
      />

      <Section eyebrow="Snapshot" title="Certification Summary dari Registry">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <SummaryStat label="Total" value={summary.totalCapabilities.toString()} tone="neutral" />
          <SummaryStat label="Core" value={summary.coreCapabilities.toString()} tone="sky" />
          <SummaryStat label="Reusable" value={summary.reusableCapabilities.toString()} tone="emerald" />
          <SummaryStat label="Experimental" value={summary.experimentalCapabilities.toString()} tone="amber" />
          <SummaryStat label="With Owner" value={summary.withOwner.toString()} tone="sky" />
          <SummaryStat label="Owner Missing" value={summary.ownerMissing.toString()} tone="red" />
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          Registry source:{" "}
          <code className="text-sky-400">foundation/evidence/registry/capability-registry-report.json</code>
        </p>
      </Section>

      <Section eyebrow="Registry" title={`${summary.totalCapabilities} Capabilities — Status Per Kriteria`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-800">
                <th className="py-2 pr-3 font-mono text-xs">ID</th>
                <th className="py-2 pr-3 font-mono text-xs">Name</th>
                <th className="py-2 pr-3 font-mono text-xs">Stability</th>
                <th className="py-2 pr-3 font-mono text-xs">Lifecycle</th>
                <th className="py-2 pr-3 font-mono text-xs">Governance</th>
                <th className="py-2 pr-3 font-mono text-xs">Owner</th>
                <th className="py-2 pr-3 font-mono text-xs">Reachability</th>
              </tr>
            </thead>
            <tbody>
              {registry.capabilities.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-900/40"
                >
                  <td className="py-2 pr-3 font-mono text-neutral-200">{c.id}</td>
                  <td className="py-2 pr-3 text-neutral-200">{c.name}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={getStabilityBadge(c.stability)} />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-neutral-300">{c.lifecycle_stage}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={getGovernanceStatusBadge(c.governance_status)} />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-neutral-300">{c.owner}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-neutral-300">{c.reachability_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500 mt-3 italic">
          Status certification diambil secara dinamis dari laporan audit runtime.
        </p>
      </Section>
    </div>
  );
}