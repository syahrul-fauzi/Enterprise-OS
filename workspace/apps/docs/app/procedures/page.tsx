import Link from "next/link";
import { getProceduresData } from "../_lib/registry-client";
import { StatusBadge } from "../_components/status-badge";
import { DataSourceBadge } from "../_components/data-source-badge";
import { Section, SectionCard, LabeledRow } from "../_components/section";
import { PageHeader } from "../_components/navigation";

export default function ProceduresPage() {
  const { data: proc, dataSource } = getProceduresData();
  const prepare = proc.active[0]!;

  return (
    <div>
      <PageHeader
        kicker="Know · Procedures"
        title="Procedure Layer — Orkestrasi Murni, Zero Domain Logic"
        subtitle="Procedure = komposisi Capability calls. Setiap assess* delegasikan 100% ke Capability yang sesuai. AI hanya conditional branch."
      />

      <DataSourceBadge dataSource={dataSource} />

      <Section eyebrow="Principle" title="Hukum Prosedur (tidak bisa dilanggar)">
        <SectionCard className="border-emerald-900/50">
          <p className="text-neutral-200 leading-relaxed">{proc.procedurePrinciple}</p>
          <p className="text-xs text-neutral-500 mt-3">
            Pelanggaran = architectural drift. Jika procedure mengandung if/else yang
            memutuskan validitas requirement (bukan hanya orkestrasi), itu bug arsitektur.
          </p>
        </SectionCard>
      </Section>

      <Section eyebrow="Active" title={`Procedure Aktif: ${prepare.name}`}>
        <div className="grid lg:grid-cols-2 gap-4 mb-5">
          <SectionCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-lg">{prepare.name}</h3>
              <StatusBadge status={prepare.status} />
            </div>
            <LabeledRow
              label="Contract"
              value={<code className="text-xs text-sky-300">{prepare.contractPath}</code>}
            />
            <LabeledRow
              label="Implementation"
              value={<code className="text-xs text-sky-300">{prepare.implementationPath}</code>}
            />
          </SectionCard>
          <SectionCard>
            <h4 className="font-semibold text-white mb-2">Inputs (PrepareReleaseInput)</h4>
            <ul className="space-y-1">
              {prepare.inputs.map((i) => (
                <li
                  key={i}
                  className="text-sm text-neutral-300 px-3 py-1.5 rounded bg-neutral-950/60 border border-neutral-800"
                >
                  <code className="text-emerald-400">{i}</code>
                </li>
              ))}
            </ul>
            <h4 className="font-semibold text-white mb-2 mt-4">Outputs (PrepareReleaseOutput)</h4>
            <ul className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {prepare.outputs.map((o) => (
                <li
                  key={o}
                  className="text-sm text-neutral-300 px-3 py-1.5 rounded bg-neutral-950/60 border border-neutral-800"
                >
                  <code className="text-sky-400">{o}</code>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </Section>

      <Section eyebrow="Step Execution" title="6 Steps Orkestrasi — Masing-Masing Delegasi Jelas">
        <ol className="space-y-3">
          {prepare.steps.map((s, i) => {
            const isConditional = s.kind === "ai.investigate";
            return (
              <li
                key={s.stepId}
                className={`p-4 rounded-lg border-l-4 ${
                  isConditional
                    ? "border-amber-500 bg-amber-950/10 border-amber-900/50 border"
                    : "border-emerald-500 bg-neutral-900/40 border-neutral-800"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{s.stepId}</p>
                      <p className="text-xs font-mono text-neutral-500">{s.kind}</p>
                    </div>
                  </div>
                  {isConditional ? (
                    <span className="text-xs font-mono px-2 py-1 rounded border border-amber-800 bg-amber-950/40 text-amber-300">
                      ⚠️ CONDITIONAL · only if hasUnknown = true
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-neutral-300 mb-2">{s.description}</p>
                <p className="text-xs font-mono text-neutral-500">
                  Delegated to →{" "}
                  <code className="text-emerald-400">{s.delegatedTo}</code>
                </p>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section eyebrow="Contract Type Excerpt" title="Readiness Status Enum + Terminal Posture">
        <pre className="bg-neutral-950 border border-neutral-800 p-4 rounded overflow-x-auto text-xs font-mono">
{`type PrepareReleaseReadinessStatus =
  | "ready"                     // ✅ happy path — release boleh deploy
  | "blocked"                   // 🚫 hard blockers — harus resolve
  | "pending_ai_investigation"; // ⏳ menunggu AI/HUMAN untuk state UNKNOWN

// READINESS DECISION LOGIC (di determine_final_posture step):
// IF hasUnknown === true   → readiness = pending_ai_investigation
// ELSE IF all 3 checks     → readiness = ready
//   (isVerified && traceComplete && evidenceComplete)
// ELSE                     → readiness = blocked`}
        </pre>
        <p className="text-xs text-neutral-500 mt-3 italic">
          Ini dikompilasi dari contracts.ts. AI investigation adalah CONDITIONAL branch
          — bukan bagian dari alur normal. 99% eksekusi release harusnya deterministic
          ready / blocked tanpa melibatkan AI sama sekali.
        </p>
      </Section>
    </div>
  );
}