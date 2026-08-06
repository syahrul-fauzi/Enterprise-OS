import { EOS_KNOWLEDGE_MODEL } from "../_lib/eos-knowledge-model";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard } from "../_components/section";
import { PageHeader } from "../_components/navigation";

export default function SurfacesPage() {
  const sf = EOS_KNOWLEDGE_MODEL.surfaces;

  return (
    <div>
      <PageHeader
        kicker="Know · Surfaces"
        title="Experience Surfaces — WORK (Eksekusi) + KNOW (Deskripsi Diri)"
        subtitle="Dua sisi yang memanggil procedure SAMA. Surface = pure presentation renderer. Zero business logic."
      />

      <Section eyebrow="Future Contract" title="Shared Execution Identity Plan (FUTURE GATE)">
        <SectionCard className="border-amber-900/50 bg-amber-950/10">
          <p className="text-sm text-neutral-200 leading-relaxed">
            {sf.sharedIdentityPlan}
          </p>
          <p className="text-xs text-amber-300/80 mt-2">
            Saat ini baru terbukti: Workspace dan Chat memiliki input/output shape procedure
            yang identik. Persisted shared executionId = Frontier 1 (NOT PROVEN).
          </p>
        </SectionCard>
      </Section>

      {sf.surfaces.map((s) => (
        <Section
          eyebrow={s.status}
          title={s.name}
          key={s.name}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <p className="text-sm text-neutral-300 max-w-2xl">{s.description}</p>
            <StatusBadge status={s.status} />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {s.routes.map((r) => (
              <div
                key={r.path}
                className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-colors"
              >
                <code className="block text-sm text-sky-400 font-mono mb-2 break-all">
                  {r.path}
                </code>
                <p className="text-xs text-neutral-300 mb-2">{r.description}</p>
                <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-600">
                  Trace: {r.requirementTrace}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
