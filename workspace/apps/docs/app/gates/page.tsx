import { EOS_KNOWLEDGE_MODEL, STATUS } from "../_lib/eos-knowledge-model";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard } from "../_components/section";
import { PageHeader } from "../_components/navigation";

export default function GatesPage() {
  const gt = EOS_KNOWLEDGE_MODEL.gates;

  return (
    <div>
      <PageHeader
        kicker="Know · Gates"
        title="Engineering Gates Dependency Order — Tidak Bisa Diskip"
        subtitle="Ini dependency order, bukan roadmap. Setiap gate harus terbukti sebelum gate berikutnya bisa dibuka."
      />

      <Section eyebrow="Principle" title="Hukum Urutan Gate — Dependency Chain Adalah Konstitusi">
        <SectionCard className="border-emerald-900/50">
          <p className="text-neutral-200 leading-relaxed">{gt.gatePrinciple}</p>
        </SectionCard>
      </Section>

      <Section eyebrow="Sequence" title="5 Gates Berurutan — Status per 2026-08-06">
        <div className="space-y-4">
          {gt.gates.map((g, idx) => {
            const isActive = g.status === STATUS.IMPLEMENTING;
            const isLocked = g.status === STATUS.LOCKED;
            const prev = idx > 0 ? gt.gates[idx - 1] : null;
            return (
              <div key={g.name} className="relative">
                {prev ? (
                  <div
                    aria-hidden
                    className="absolute left-6 -top-2 h-3 w-0.5 bg-neutral-700"
                  />
                ) : null}
                <div
                  className={`relative flex items-start gap-4 p-5 rounded-xl border ${
                    isActive
                      ? "border-emerald-700 bg-emerald-950/15 shadow-lg shadow-emerald-900/20"
                      : isLocked
                        ? "border-neutral-800 bg-neutral-900/40 opacity-75"
                        : "border-neutral-800 bg-neutral-900/40"
                  }`}
                >
                  <div
                    className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-lg ${
                      isActive
                        ? "bg-emerald-700 text-white ring-4 ring-emerald-700/20"
                        : isLocked
                          ? "bg-neutral-800 text-neutral-500"
                          : "bg-emerald-800 text-white"
                    }`}
                  >
                    {g.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white">{g.name}</h3>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="text-sm text-neutral-400 mb-3">
                      <span className="text-neutral-600 font-mono">DEPENDS ON: </span>
                      {g.dependency}
                    </p>
                    {g.lockedAreas && g.lockedAreas.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1.5">
                          Locked areas (akan dibuka kalau gate proven)
                        </p>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {g.lockedAreas.map((a) => (
                            <div
                              key={a}
                              className="px-3 py-2 rounded-md bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300"
                            >
                              {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Why this order" title="Alasan Dependency Setiap Link Tidak Bisa Putus">
        <ol className="space-y-3">
          <li className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <p className="text-sm font-semibold text-white mb-1">
              Gate 1 (KNOW) → Gate 2 (Execution Identity)
            </p>
            <p className="text-sm text-neutral-400">
              Sebelum membangun shared executionId, kita harus BISA menjelaskan ke manusia
              apa EOS ini dan apa yang sudah terbukti (melalui surface ini). Tanpa KNOW,
              tidak ada baseline oracle untuk memvalidasi apakah execution identity
              sudah benar.
            </p>
          </li>
          <li className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <p className="text-sm font-semibold text-white mb-1">
              Gate 2 (Identity) → Gate 3 (Durable Evidence)
            </p>
            <p className="text-sm text-neutral-400">
              Evidence durable harus tahu: execution ID APA yang menghasilkan evidence ini,
              siapa produser-nya, dan langkah procedure mana yang memproduksinya. Tanpa
              execution identity, evidence adalah file terputus tanpa attribution chain.
            </p>
          </li>
          <li className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <p className="text-sm font-semibold text-white mb-1">
              Gate 3 (Evidence) → Gate 4 (Continuation)
            </p>
            <p className="text-sm text-neutral-400">
              Resume procedure butuh jawaban: state apa yang harus dilanjutkan, dan apa
              evidence snapshot sebelum WAIT_FOR_AI_OR_HUMAN. Tanpa durable evidence
              store, resume berarti restart dari nol = tidak ada continuation.
            </p>
          </li>
          <li className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <p className="text-sm font-semibold text-white mb-1">
              Gate 4 (Continuation) → Gate 5 (API/Worker/Agent)
            </p>
            <p className="text-sm text-neutral-400">
              Runtime model harus stabil (identity terbukti, evidence terbukti, resume
              bekerja) SEBELUM mengekspos lewat API, menjalankan di worker terpisah,
              atau menambah agent loop. Menambahkan API sebelum runtime model utuh =
              menciptakan surface di atas fondasi yang berubah = technical debt bencana.
            </p>
          </li>
        </ol>
      </Section>
    </div>
  );
}