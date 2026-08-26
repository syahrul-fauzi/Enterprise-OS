import Link from "next/link";
import { EOS_KNOWLEDGE_MODEL, STATUS, type StatusValue, type StatusDimension } from "./_lib/eos-knowledge-model";
import { StatusBadge } from "./_components/status-badge";
import { Section, SectionCard, LabeledRow } from "./_components/section";
import { PageHeader } from "./_components/navigation";

const QS = EOS_KNOWLEDGE_MODEL.sevenQuestions;
const ANSWER_FOR = [
  {
    q: QS[0]!.q,
    a: EOS_KNOWLEDGE_MODEL.identity.whatIsEos,
    jumpTo: "/architecture",
    jumpLabel: "Lihat Architecture →",
  },
  {
    q: QS[1]!.q,
    a: EOS_KNOWLEDGE_MODEL.architecture.boundaryRule,
    jumpTo: "/architecture",
    jumpLabel: "Lihat Layered Model →",
  },
  {
    q: QS[2]!.q,
    a: `Yang terbukti berjalan: ${EOS_KNOWLEDGE_MODEL.capabilities.provenWork.map((c) => c.name).join(", ")}. Capability registry memiliki ${EOS_KNOWLEDGE_MODEL.capabilities.certificationSummary.totalCapabilities} item, status PARTIAL (performance evidence belum ada).`,
    jumpTo: "/capabilities",
    jumpLabel: "Lihat Capabilities →",
  },
  {
    q: QS[3]!.q,
    a: `Procedure aktif: ${EOS_KNOWLEDGE_MODEL.procedures.active.map((p) => `${p.name} (${p.status})`).join(", ")}. Ini procedure orkestrasi murni — zero domain logic, semua assess() delegasikan ke Capability.`,
    jumpTo: "/procedures",
    jumpLabel: "Lihat Contract Procedure →",
  },
  {
    q: QS[4]!.q,
    a: `Dua surface aktif: WORK (apps/web, ${STATUS.PROVEN}) untuk eksekusi pekerjaan, dan KNOW (apps/docs, ${STATUS.IMPLEMENTING}) untuk memahami keadaan sistem. Setiap surface memiliki routes yang terdaftar di halaman Surfaces.`,
    jumpTo: "/surfaces",
    jumpLabel: "Lihat Routes Surfaces →",
  },
  {
    q: QS[5]!.q,
    a: `${EOS_KNOWLEDGE_MODEL.evidence.provenRequirements.length} requirements (REQ-001 s/d REQ-008) untuk Academic Community vertical slice = 100% terverifikasi. Functional test: ${EOS_KNOWLEDGE_MODEL.evidence.academicVerification.functionalTests}. Capability reuse ratio = ${EOS_KNOWLEDGE_MODEL.evidence.academicVerification.capabilityReuseRatio}.`,
    jumpTo: "/evidence",
    jumpLabel: "Lihat Evidence Registry →",
  },
  {
    q: QS[6]!.q,
    a: `${EOS_KNOWLEDGE_MODEL.evidence.frontierPending.length} frontier belum terbukti: Execution Identity (shared state Workspace & Chat), Durable Evidence (procedure output auto-register ke registry), Continuation/Resume (restart procedure dari WAIT_FOR_AI_OR_HUMAN). Gate dependency di halaman Gates.`,
    jumpTo: "/gates",
    jumpLabel: "Lihat Gates Dependency →",
  },
] as const;

export default function OverviewPage() {
  const id = EOS_KNOWLEDGE_MODEL.identity;
  const st = EOS_KNOWLEDGE_MODEL.state;

  return (
    <div>
      <PageHeader
        kicker="EOS · KNOW · V1"
        title="Enterprise Operating System — Self-Description Surface"
        subtitle={id.mission}
      />

      {/* K1 — KNOW → WORK BRIDGE — FIRST THING AFTER HERO */}
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

      {/* K5 — TERMINOLOGY CLARITY — 6 Istilah Utama */}
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

      {/* IDENTITY RINGKAS */}
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

      {/* 7 CORE QUESTIONS — THE HEART OF KNOW */}
      <Section
        eyebrow="Pertanyaan Inti · The 7"
        title="Tanpa membaca source code, manusia bisa menjawab ini semua"
        className="bg-gradient-to-br from-neutral-900/80 via-blue-950/10 to-purple-950/10 border-neutral-800"
      >
        <p className="text-sm text-neutral-400 mb-6 italic">
          Apabila satu pertanyaan tidak terjawab oleh surface ini, maka KNOW gagal.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {ANSWER_FOR.map((x, i) => {
            const isLast = i === ANSWER_FOR.length - 1;
            return (
              <SectionCard
                key={x.q}
                className={`${isLast ? "md:col-span-2" : ""}`}
              >
                <p className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
                  {x.q}
                </p>
                <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
                  {x.a}
                </p>
                <Link
                  href={x.jumpTo}
                  className="text-xs font-mono text-sky-400 hover:text-sky-300"
                >
                  {x.jumpLabel}
                </Link>
              </SectionCard>
            );
          })}
        </div>
      </Section>

      {/* QUICK STATUS CARDS */}
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
            <p className="text-xs text-neutral-500 mt-1">scope: {st.scope}</p>
          </SectionCard>
          <SectionCard className="border-sky-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Requirements Proven
            </p>
            <p className="text-2xl font-bold text-sky-300">
              {EOS_KNOWLEDGE_MODEL.evidence.provenRequirements.length}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Academic Community</p>
          </SectionCard>
          <SectionCard className="border-amber-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Registry Capabilities
            </p>
            <p className="text-2xl font-bold text-amber-300">
              {EOS_KNOWLEDGE_MODEL.capabilities.certificationSummary.totalCapabilities}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              100% PARTIAL — 0 FULLY CERTIFIED
            </p>
          </SectionCard>
          <SectionCard className="border-red-900/50">
            <p className="text-xs font-mono text-neutral-500 mb-1">
              Frontier Not Proven
            </p>
            <p className="text-2xl font-bold text-red-300">
              {EOS_KNOWLEDGE_MODEL.evidence.frontierPending.length}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {EOS_KNOWLEDGE_MODEL.gates.gates.filter((g) => g.status === STATUS.LOCKED).length} gates terkunci
            </p>
          </SectionCard>
        </div>
      </Section>

      {/* 8 ROUTES MAP — DASHBOARD KE ROUTE LAIN */}
      <Section eyebrow="Know Routes" title="8 pintu masuk surface ini">
        <p className="text-xs text-neutral-500 mb-4 italic">
          Status badge: IMPLEMENTED = route ada dan return HTTP 200. PROVEN = seluruh KNOW sudah lulus human validation gate.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <LinkRouteCard href="/" label="Overview" status={STATUS.IMPLEMENTED} desc="7 pertanyaan inti, identity, snapshot" />
          <LinkRouteCard href="/architecture" label="Architecture" status={STATUS.IMPLEMENTED} desc="WORK/KNOW boundary, layered model, principles" />
          <LinkRouteCard href="/capabilities" label="Capabilities" status={STATUS.IMPLEMENTED} desc="16 registry item, proven work, locked areas" />
          <LinkRouteCard href="/procedures" label="Procedures" status={STATUS.IMPLEMENTED} desc="prepare_release contract + delegation steps" />
          <LinkRouteCard href="/surfaces" label="Surfaces" status={STATUS.IMPLEMENTED} desc="WORK routes + KNOW routes dengan actual paths" />
          <LinkRouteCard href="/state" label="State" status={STATUS.IMPLEMENTED} desc="Procedure lifecycle machine + terminal states" />
          <LinkRouteCard href="/evidence" label="Evidence" status={STATUS.IMPLEMENTED} desc="REQ-001..008 proven + frontier pending" />
          <LinkRouteCard href="/gates" label="Gates" status={STATUS.IMPLEMENTED} desc="Dependency order — tidak bisa diskip" />
        </div>
      </Section>

      {/* K3 — STATUS VOCABULARY CLARITY — 4 DIMENSIONS, NOT 9 FLAT BADGES */}
      <Section eyebrow="Status Semantics" title="4 Dimensi Status — Pisahkan Epistemic State. Badge = claim tentang dimensi mana">
        <p className="text-xs text-neutral-500 mb-5 italic">
          ⚠️ PROVEN ≠ STABLE ≠ IMPLEMENTED ≠ UNVERIFIED. Mereka beda dimensi. Satu Capability bisa STABLE (maturity) + PARTIAL (validation) + UNVERIFIED (performance proof) SECARA BERSAMAAN.
        </p>
        <div className="space-y-5">
          {(["Implementation", "Validation", "Maturity", "Proof"] as const).map((dim: StatusDimension) => {
            const meta = EOS_KNOWLEDGE_MODEL.statusDimensionLabels[dim];
            const items = EOS_KNOWLEDGE_MODEL.statusVocabulary.filter((s) => s.dimension === dim);
            return (
              <div key={dim} className="space-y-2">
                <div className="pb-2 border-b border-neutral-800">
                  <p className="text-xs font-mono uppercase tracking-wider text-sky-400 mb-1">
                    {meta.label}
                  </p>
                  <p className="text-sm text-neutral-400">{meta.explanation}</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((s) => (
                    <SectionCard key={String(s.term)} className="border-neutral-800">
                      <div className="mb-2"><StatusBadge status={s.term as StatusValue} /></div>
                      <p className="text-sm font-medium text-neutral-200 mb-1">{s.meaning}</p>
                      <p className="text-xs text-neutral-500">Contoh penggunaan: {s.typicalUse}</p>
                    </SectionCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <footer className="mt-16 pt-6 border-t border-neutral-800 text-center">
        <p className="text-xs text-neutral-500">
          EOS_KNOWLEDGE_MODEL is Object.freeze() · canonical state cannot be
          mutated at runtime · evidence sources = registry files, not claims
        </p>
      </footer>
    </div>
  );
}

function LinkRouteCard({
  href,
  label,
  status,
  desc,
}: {
  href: string;
  label: string;
  status: StatusValue;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-800/40 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white group-hover:text-sky-300">
          /{label.toLowerCase()}
        </span>
        <StatusBadge status={status} />
      </div>
      <p className="text-xs text-neutral-400">{desc}</p>
    </Link>
  );
}