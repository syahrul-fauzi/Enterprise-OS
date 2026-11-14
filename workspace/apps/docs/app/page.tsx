import Link from "next/link";
import { getCapabilityRegistry, getCertificationSummary, getEvidenceReconAudit } from "./_lib/registry-client";
import { EOS_KNOWLEDGE_MODEL, STATUS, type StatusValue } from "./_lib/eos-knowledge-model";
import { StatusBadge } from "./_components/status-badge";
import { Section, SectionCard, LabeledRow } from "./_components/section";
import { PageHeader } from "./_components/navigation";

export default function OverviewPage() {
  const registry = getCapabilityRegistry();
  const summary = getCertificationSummary(registry);
  const reconAudit = getEvidenceReconAudit();
  const id = EOS_KNOWLEDGE_MODEL.identity;
  const st = EOS_KNOWLEDGE_MODEL.state;
  const capabilities = registry.capabilities;
  const provenCapabilities = capabilities.filter(c => c.status === 'PROVEN' || c.stability === 'stable').map(c => c.name);

  return (
    <div>
      <PageHeader
        kicker="EOS · KNOW · V1"
        title="Enterprise Operating System — Self-Description Surface"
        subtitle={id.mission}
      />

      <Section
        eyebrow="Transition · Understand → Do"
        title="UNDERSTAND EOS → WORK WITH EOS"
        className="border-sky-900/30 bg-sky-950/10"
      >
        <p className="text-sm text-neutral-400 mb-5 italic max-w-2xl">
          Anda berada di KNOW (tempat memahami). Setelah memahami, pindah ke WORK (tempat melakukan)
          untuk menjalankan procedure secara nyata. Dua sisi yang konsisten — satu sistem.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <SectionCard className="border-neutral-800">
            <p className="text-xs font-mono uppercase tracking-wider text-sky-400 mb-2">
              ① MEMAHAMI · KNOW · ANDA DISINI
            </p>
            <h3 className="text-lg font-semibold text-white mb-2">KNOW Surface (Self-Description)</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Melihat apa yang terbukti, apa yang belum terbukti, dan hubungan antara Capability ↔ Procedure ↔ Evidence ↔ Gate.
              Tanpa membaca source code, Anda bisa memahami keadaan EOS secara utuh.
            </p>
            <div className="mt-4">
              <StatusBadge status={STATUS.IMPLEMENTING} />
              <p className="text-xs text-neutral-500 mt-2">
                Validation Stage: Controlled Correction Pass. Human Black-Box #3 pending.
              </p>
            </div>
          </SectionCard>

          <SectionCard className="border-emerald-900/40 bg-emerald-950/5">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2">
              ② MELAKUKAN · WORK · GO
            </p>
            <h3 className="text-lg font-semibold text-white mb-2">WORK Surface — Release Readiness</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Menjalankan procedure <code className="text-emerald-400">prepare_release</code>.
              Workspace (terstruktur) + Chat (conversational), dua cara mengendalikan procedure YANG SAMA —
              shared I/O shape, same execution contract.
            </p>
            <div className="mt-4">
              <a
                href={id.workBridgeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-5 py-2.5 rounded-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
              >
                → BUKA WORK SURFACE
              </a>
              <p className="text-xs text-neutral-500 mt-3">
                Recomended: /readiness?surface=split → Workspace + Chat berdampingan.
              </p>
            </div>
          </SectionCard>
        </div>
      </Section>

      <Section eyebrow="Glossary" title="6 Istilah EOS — bahasa yang sama tanpa jargon internal">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {id.terminology.map((t: Record<string,string>) => (
            <SectionCard key={t.term} className="border-neutral-800">
              <p className="text-sky-300 font-mono font-bold mb-1">{t.term}</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{t.definition}</p>
            </SectionCard>
          ))}
        </div>
      </Section>

      <Section eyebrow="Identity" title="Siapa EOS ini, dalam 5 baris">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LabeledRow label="Nama" value={id.name} />
          <LabeledRow label="Versi" value={id.version} />
          <LabeledRow label="Last Updated" value={id.lastUpdated} />
          <LabeledRow
            label="Dua sisi"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={STATUS.PROVEN} /> WORK
                <StatusBadge status={STATUS.IMPLEMENTING} /> KNOW · THIS
              </div>
            }
          />
        </div>
        <div className="mt-5">
          <StatusBadge status={st.activeGate as StatusValue} />
          <p className="text-xs text-neutral-500 mt-2">
            Next gate: {st.nextGate}
          </p>
        </div>
      </Section>

      <Section
        eyebrow="Pertanyaan Inti · The 7"
        title="Tanpa membaca source code, manusia bisa menjawab ini semua"
        className="bg-gradient-to-br from-neutral-900/80 via-blue-950/10 to-purple-950/10 border-neutral-800"
      >
        <p className="text-sm text-neutral-400 mb-6 italic">
          Apabila satu pertanyaan tidak terjawab oleh surface ini, maka KNOW gagal.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <SectionCard>
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Apa itu EOS?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              {EOS_KNOWLEDGE_MODEL.identity.whatIsEos}
            </p>
            <Link href="/architecture" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Architecture →
            </Link>
          </SectionCard>

          <SectionCard>
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Apa aturan boundary arsitektur?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              {EOS_KNOWLEDGE_MODEL.architecture.boundaryRule}
            </p>
            <Link href="/architecture" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Layered Model →
            </Link>
          </SectionCard>

          <SectionCard>
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Apa yang sudah terbukti berjalan?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              Yang terbukti berjalan: {provenCapabilities.join(", ")}. Capability registry memiliki {summary.totalCapabilities} item, {summary.stableCapabilities} stable, {summary.experimentalCapabilities} experimental. Reuse percentage: {reconAudit.reuse_percentage}%.
            </p>
            <Link href="/capabilities" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Capabilities →
            </Link>
          </SectionCard>

          <SectionCard>
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Apa procedure yang aktif saat ini?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              Procedure aktif: {EOS_KNOWLEDGE_MODEL.procedures.active.map((p) => `${p.name} (${p.status})`).join(", ")}. Ini procedure orkestrasi murni — zero domain logic, semua assess() delegasikan ke Capability.
            </p>
            <Link href="/procedures" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Contract Procedure →
            </Link>
          </SectionCard>

          <SectionCard>
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Surface apa yang tersedia?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              Dua surface aktif: WORK (apps/web, {STATUS.PROVEN}) untuk eksekusi pekerjaan, dan KNOW (apps/docs, {STATUS.IMPLEMENTING}) untuk memahami keadaan sistem. Setiap surface memiliki routes yang terdaftar di halaman Surfaces.
            </p>
            <Link href="/surfaces" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Routes Surfaces →
            </Link>
          </SectionCard>

          <SectionCard>
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Apa status evidence saat ini?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              Boundary compliance: {reconAudit.reuse_percentage}% terverifikasi. Semua core primitives reused dari golden spine dan existing capabilities.
            </p>
            <Link href="/evidence" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Evidence Registry →
            </Link>
          </SectionCard>

          <SectionCard className="md:col-span-2">
            <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
              Frontier apa yang belum terbukti?
            </p>
            <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
              Frontier belum terbukti: Execution Identity (shared state Workspace & Chat), Durable Evidence (procedure output auto-register ke registry), Continuation/Resume (restart procedure dari WAIT_FOR_AI_OR_HUMAN). Gate dependency di halaman Gates.
            </p>
            <Link href="/gates" className="text-xs font-mono text-sky-400 hover:text-sky-300">
              Lihat Gates Dependency →
            </Link>
          </SectionCard>
        </div>
      </Section>

      <Section eyebrow="Snapshot" title="Sekarang, di detik ini">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SectionCard className="border-emerald-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Fokus Saat Ini · Human-Facing
            </p>
            <p className="text-emerald-300 font-semibold">Validation Stage 1 · KNOW Acceptance</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Internal: <span className="font-mono">{st.currentMode}</span>
            </p>
          </SectionCard>

          <SectionCard className="border-sky-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Capabilities Total
            </p>
            <p className="text-sky-300 font-bold text-xl">{summary.totalCapabilities}</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {summary.stableCapabilities} stable · {summary.experimentalCapabilities} experimental
            </p>
          </SectionCard>

          <SectionCard className="border-amber-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Reuse Percentage
            </p>
            <p className="text-amber-300 font-bold text-xl">{reconAudit.reuse_percentage}%</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Boundary compliance verified
            </p>
          </SectionCard>

          <SectionCard className="border-emerald-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Active Gate
            </p>
            <StatusBadge status={st.activeGate as StatusValue} />
            <p className="text-[11px] text-neutral-500 mt-1">
              Next: {st.nextGate}
            </p>
          </SectionCard>
        </div>
      </Section>
    </div>
  );
}