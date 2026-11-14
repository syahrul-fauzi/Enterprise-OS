import { getCapabilityRegistry, getCertificationSummary, getEvidenceReconAudit, getEvidenceProducerConvergenceReport } from "../_lib/registry-client";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";
import { STATUS, type StatusValue } from "../_lib/eos-knowledge-model";

export default function EvidencePage() {
  const registry = getCapabilityRegistry();
  const summary = getCertificationSummary(registry);
  const reconAudit = getEvidenceReconAudit();
  const convergenceReport = getEvidenceProducerConvergenceReport();

  return (
    <div>
      <PageHeader
        kicker="Know · Evidence"
        title="Evidence Registry — Yang Terbukti vs Yang Belum"
        subtitle="Bukti harus berasal dari file registry. Output procedure ≠ evidence durable (prinsip non-self-proven)."
      />

      <Section eyebrow="Principle" title="Hukum Evidence — Anti Self-Proven Circular Claims">
        <SectionCard className="border-emerald-900/50">
          <p className="text-neutral-200 leading-relaxed">
            Evidence harus berasal dari registry bukti yang terpisah, bukan dari output procedure itu sendiri.
            Setiap klaim status harus memiliki referensi file bukti yang dapat diverifikasi secara independen.
          </p>
        </SectionCard>
      </Section>

      <Section eyebrow="Evidence Summary" title="Ringkasan Status Bukti Sistem">
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <SectionCard className="border-emerald-900/60 text-center">
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Reuse Percentage
            </p>
            <p className="text-2xl font-bold text-emerald-300">
              {reconAudit.reuse_percentage}%
            </p>
          </SectionCard>
          <SectionCard className="border-sky-900/60 text-center">
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Capabilities Total
            </p>
            <p className="text-2xl font-bold text-sky-300">
              {summary.totalCapabilities}
            </p>
          </SectionCard>
          <SectionCard className="border-amber-900/60 text-center">
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Evidence Producers
            </p>
            <p className="text-2xl font-bold text-amber-300">
              {convergenceReport.summary.producer_count}
            </p>
          </SectionCard>
        </div>
      </Section>

      <Section eyebrow="Boundary Verification" title="Locked Boundaries — 100% Compliance">
        <div className="space-y-3">
          {Object.entries(reconAudit.locked_boundaries_verified).map(([boundary, checks]) => (
            <div key={boundary} className="p-4 rounded-lg border border-emerald-900/40 bg-emerald-950/5">
              <p className="text-sky-300 font-mono font-bold text-xs uppercase tracking-wider mb-2">
                {boundary}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(checks).map(([check, percentage]) => (
                  <div key={check} className="flex items-center justify-between p-2 rounded bg-neutral-900/40">
                    <code className="text-xs text-neutral-300">{check}</code>
                    <span className="text-xs font-bold text-emerald-300">{percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Findings" title="Findings — Existing Capabilities Reused">
        <ul className="space-y-2">
          {reconAudit.findings.existing_capabilities_found.map((cap, i) => (
            <li key={i} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/40">
              <code className="text-xs text-sky-300">{cap}</code>
            </li>
          ))}
        </ul>
      </Section>

      {reconAudit.findings.minimal_fix_applied && (
        <Section eyebrow="Minimal Fix" title="Minimal Fix Applied — ≤3 Lines Per File">
          <SectionCard className="border-amber-900/40 bg-amber-950/10">
            <p className="text-sm text-neutral-200 mb-2">
              {reconAudit.findings.minimal_fix_applied.description}
            </p>
            <p className="text-xs text-neutral-400">
              File: <code className="text-sky-300">{reconAudit.findings.minimal_fix_applied.file}</code>
            </p>
            <p className="text-xs text-neutral-400">
              Lines changed: <span className="text-amber-300 font-bold">{reconAudit.findings.minimal_fix_applied.lines_changed}</span>
            </p>
          </SectionCard>
        </Section>
      )}

      <Section eyebrow="Evidence Producers" title="Registered Evidence Producers">
        <div className="space-y-3">
          {convergenceReport.producers.map((producer) => (
            <div key={producer.producer_id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <code className="text-sky-300 font-mono font-bold text-sm">
                  {producer.producer_id}
                </code>
                <StatusBadge status={STATUS.PROVEN} />
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-neutral-400">
                <p>Artifact type: <span className="text-neutral-200">{producer.artifact_type}</span></p>
                <p>Subject type: <span className="text-neutral-200">{producer.subject_type}</span></p>
                <p>Schema version: <span className="text-neutral-200">{producer.schema_version}</span></p>
                <p>Default projection: <code className="text-sky-300">{producer.default_projection_ref}</code></p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Recommendations" title="Recommendations — Next Highest Leverage Actions">
        <ul className="space-y-2">
          {reconAudit.recommendations.map((rec, i) => (
            <li key={i} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/40">
              <p className="text-sm text-neutral-200">{rec}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Recon Metadata" title="Recon Audit Metadata">
        <div className="grid sm:grid-cols-2 gap-3">
          <SectionCard className="border-neutral-800">
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1">Work ID</p>
            <code className="text-sm text-sky-300">{reconAudit.work_id}</code>
          </SectionCard>
          <SectionCard className="border-neutral-800">
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1">Recon Completed At</p>
            <p className="text-sm text-neutral-200">{new Date(reconAudit.recon_completed_at).toLocaleString()}</p>
          </SectionCard>
        </div>
      </Section>
    </div>
  );
}