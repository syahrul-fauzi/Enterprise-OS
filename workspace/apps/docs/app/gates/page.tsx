import { getGateStatus } from "../_lib/registry-client";
import { StatusBadge } from "../_components/status-badge";
import { Section, SectionCard } from "../_components/section";
import { PageHeader } from "../_components/navigation";

export default function GatesPage() {
  const gateStatus = getGateStatus();

  const gates = [
    {
      order: 1,
      name: "Gate 1 — KNOW Surface",
      status: "SUCCESS",
      dependency: "Tidak ada dependensi (baseline)",
      lockedAreas: [],
    },
    {
      order: 2,
      name: "Gate 2 — Execution Identity",
      status: "LOCKED",
      dependency: "Harus Gate 1 selesai",
      lockedAreas: ["Shared executionId persistence", "Execution attribution chain"],
    },
    {
      order: 3,
      name: "Gate 3 — Durable Evidence",
      status: "LOCKED",
      dependency: "Harus Gate 2 selesai",
      lockedAreas: ["Evidence immutable store", "Evidence snapshot chain"],
    },
    {
      order: 4,
      name: "Gate 4 — Continuation",
      status: "LOCKED",
      dependency: "Harus Gate 3 selesai",
      lockedAreas: ["Procedure resume from WAIT state", "State reconstruction"],
    },
    {
      order: 5,
      name: "Gate 5 — API/Worker/Agent",
      status: "LOCKED",
      dependency: "Harus Gate 4 selesai",
      lockedAreas: ["External API exposure", "Worker runtime", "Agent loop integration"],
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Know · Gates"
        title="Engineering Gates Dependency Order — Tidak Bisa Diskip"
        subtitle="Ini dependency order, bukan roadmap. Setiap gate harus terbukti sebelum gate berikutnya bisa dibuka."
      />

      <Section eyebrow="Principle" title="Hukum Urutan Gate — Dependency Chain Adalah Konstitusi">
        <SectionCard className="border-emerald-900/50">
          <p className="text-neutral-200 leading-relaxed">
            Urutan gate tidak bisa diubah. Setiap gate bergantung pada bukti gate sebelumnya.
            Melompati gate = architectural drift dan technical debt.
          </p>
        </SectionCard>
      </Section>

      <Section eyebrow="Current Status" title={`Status Gate Aktif: ${gateStatus.phase.current}`}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SectionCard className="border-emerald-900/50 bg-emerald-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Phase Saat Ini</p>
            <p className="text-emerald-300 font-bold">{gateStatus.phase.current}</p>
          </SectionCard>
          <SectionCard className="border-sky-900/50 bg-sky-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Framework Status</p>
            <p className="text-sky-300 font-semibold text-sm">{gateStatus.phase.gate_c1_framework_status}</p>
          </SectionCard>
          <SectionCard className="border-purple-900/50 bg-purple-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Science Kernel</p>
            <p className="text-purple-300 font-semibold text-sm">{gateStatus.science_kernel.status}</p>
          </SectionCard>
          <SectionCard className="border-amber-900/50 bg-amber-950/10">
            <p className="text-xs font-mono uppercase text-neutral-500 mb-1">Generated At</p>
            <p className="text-amber-300 font-semibold text-sm">{new Date(gateStatus.generated_at_utc).toLocaleString()}</p>
          </SectionCard>
        </div>
      </Section>

      <Section eyebrow="Governance Platform" title="Status Komponen Governance">
        <div className="grid sm:grid-cols-2 gap-3">
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Constitution</p>
              <StatusBadge status={gateStatus.governance_platform.constitution.status} />
            </div>
            <p className="text-xs text-neutral-400">Law profile: {gateStatus.governance_platform.constitution.law_profile}</p>
          </SectionCard>
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Dependency Graph</p>
              <StatusBadge status={gateStatus.governance_platform.dependency_graph.status} />
            </div>
            <p className="text-xs text-neutral-400">
              Cycles: {gateStatus.governance_platform.dependency_graph.dependency_cycles} | Violations: {gateStatus.governance_platform.dependency_graph.boundary_violations}
            </p>
          </SectionCard>
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Contract Governance</p>
              <StatusBadge status={gateStatus.governance_platform.contract_governance.status} />
            </div>
            <p className="text-xs text-neutral-400">Ready contracts: {gateStatus.governance_platform.contract_governance.ready_contracts}</p>
          </SectionCard>
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Trust Framework</p>
              <StatusBadge status={gateStatus.governance_platform.trust_framework.status} />
            </div>
            <p className="text-xs text-neutral-400">Frameworks: {gateStatus.governance_platform.trust_framework.framework_count}</p>
          </SectionCard>
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Specification System</p>
              <StatusBadge status={gateStatus.governance_platform.specification_system.status} />
            </div>
            <p className="text-xs text-neutral-400">Conformance: {gateStatus.governance_platform.specification_system.conformance_status}</p>
          </SectionCard>
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Capability Graph</p>
              <StatusBadge status={gateStatus.governance_platform.capability_graph.status} />
            </div>
            <p className="text-xs text-neutral-400">
              Edges: {gateStatus.governance_platform.capability_graph.dependency_edge_count} | Unstable: {gateStatus.governance_platform.capability_graph.unstable_dependency_count}
            </p>
          </SectionCard>
        </div>
      </Section>

      <Section eyebrow="Sequence" title="5 Gates Berurutan — Dependency Order">
        <div className="space-y-4">
          {gates.map((g, idx) => {
            const isActive = g.status === "IMPLEMENTING";
            const isLocked = g.status === "LOCKED";
            const prev = idx > 0 ? gates[idx - 1] : null;
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