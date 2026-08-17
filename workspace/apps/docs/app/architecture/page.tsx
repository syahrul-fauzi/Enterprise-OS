import { EOS_KNOWLEDGE_MODEL, STATUS } from "../_lib/eos-knowledge-model.js";
import { StatusBadge } from "../_components/status-badge.js";
import { Section, SectionCard, LabeledRow } from "../_components/section.js";
import { PageHeader } from "../_components/navigation.js";

export default function ArchitecturePage() {
  const arch = EOS_KNOWLEDGE_MODEL.architecture;
  const layers = arch.layers;

  return (
    <div>
      <PageHeader
        kicker="Know · Architecture"
        title="Arsitektur EOS V1 — WORK vs KNOW Boundary"
        subtitle="Dua sisi yang konsisten: satu menjalankan, satu menjelaskan. Keduanya memanggil procedure yang sama."
      />

      <Section eyebrow="Topology" title="Diagram Arsitektur Top-Level">
        <pre className="bg-neutral-950 border border-neutral-800 p-5 rounded-lg overflow-x-auto text-emerald-400/90 font-mono text-[11.5px] leading-6">
{arch.diagram}
        </pre>
      </Section>

      <Section eyebrow="Boundary Rule" title="Aturan Konstitusi Antara WORK dan KNOW">
        <SectionCard className="border-sky-900/50">
          <p className="text-neutral-200 leading-relaxed">{arch.boundaryRule}</p>
          <p className="text-xs text-neutral-500 mt-3">
            Pelanggaran aturan ini = architectural drift. Dianggap konstitusional
            violation. Tidak boleh ada business logic fork antara Workspace UI dan
            Chat UI — keduanya harus shared procedure call.
          </p>
        </SectionCard>
      </Section>

      <Section eyebrow="Layered Model" title="4 Lapisan Arsitektur EOS">
        <div className="space-y-4">
          {layers.map((l, idx) => {
            const isSurface = idx === 0;
            const isFrontier = idx === layers.length - 1;
            return (
              <div
                key={l.name}
                className={`p-5 rounded-lg border ${
                  isSurface
                    ? "border-emerald-900/50 bg-emerald-950/10"
                    : isFrontier
                      ? "border-red-900/50 bg-red-950/10"
                      : "border-neutral-800 bg-neutral-900/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-lg font-bold text-white">
                    Layer {idx + 1} — {l.name}
                  </h3>
                  <StatusBadge
                    status={isSurface ? STATUS.PROVEN : isFrontier ? STATUS.LOCKED : STATUS.PARTIAL}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  {l.items.map((item) => (
                    <div
                      key={item}
                      className="text-sm text-neutral-300 py-1.5 px-3 bg-neutral-950/50 rounded border border-neutral-800"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono text-neutral-500">
                  Principle: {l.principle}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Principles" title="Prinsip Arsitektur (tidak bisa dinegosiasikan)">
        <div className="grid md:grid-cols-2 gap-3">
          {[
            [
              "Single Source of Truth",
              "Setiap domain fact hanya ada di satu tempat canonical. Surface tidak menyimpan truth.",
            ],
            [
              "Procedure ≠ Capability",
              "Procedure = orkestrasi (zero domain logic). Capability = domain data + rules.",
            ],
            [
              "AI = Conditional Branching",
              "AI hanya dipanggil pada state UNKNOWN; deterministic path tetap default.",
            ],
            [
              "Evidence ≠ Procedure Output",
              "Output procedure tidak auto jadi evidence — butuh registry step terpisah.",
            ],
            [
              "Shared Execution Identity",
              "Workspace & Chat = different surface, same executionId and state (FUTURE GATE).",
            ],
            [
              "Dependency Order = Law",
              "Gate tidak bisa diskip. Execution Identity sebelum Durable Evidence sebelum Continuation.",
            ],
          ].map(([t, d]) => (
            <SectionCard key={t}>
              <p className="font-semibold text-white mb-1">{t}</p>
              <p className="text-xs text-neutral-400">{d}</p>
            </SectionCard>
          ))}
        </div>
      </Section>

      <Section eyebrow="Evidence Source" title="Di mana data halaman ini berasal?">
        <LabeledRow
          label="Capability Registry"
          value={
            <code className="text-xs text-sky-300">
              foundation/evidence/registry/capability-certification.json (16 caps)
            </code>
          }
        />
        <LabeledRow
          label="Procedure Contracts"
          value={
            <code className="text-xs text-sky-300">
              procedures/prepare-release/contracts.ts
            </code>
          }
        />
        <LabeledRow
          label="Surface Routes"
          value={
            <code className="text-xs text-sky-300">
              apps/web/app/**/page.tsx (12 route WORK), apps/docs/app/**/page.tsx (8 route KNOW)
            </code>
          }
        />
        <LabeledRow
          label="Proven RTM Chains"
          value={
            <code className="text-xs text-sky-300">
              .eos/evidence/req-001-rtm.yaml through req-008-rtm.yaml
            </code>
          }
        />
      </Section>
    </div>
  );
}
