"use client";

import type {
  ActivityEntry,
  WorkRealityPerspective,
} from "@repo/presentation-entities";

const PERSPECTIVE_TITLES: Record<WorkRealityPerspective, string> = {
  customer: "Riwayat Pekerjaan",
  professional: "Riwayat Penanganan",
  operator: "Riwayat Eksekusi",
  agent: "Activity Trail",
  notary: "Riwayat Verifikasi Dokumen",
};

const TYPE_STYLES: Record<
  ActivityEntry["type"],
  { dot: string; label: string; badge: string }
> = {
  created: {
    dot: "bg-slate-400",
    label: "Dibuat",
    badge: "bg-slate-100 text-slate-700",
  },
  assigned: {
    dot: "bg-indigo-500",
    label: "Penugasan",
    badge: "bg-indigo-100 text-indigo-700",
  },
  evidence: {
    dot: "bg-emerald-500",
    label: "Bukti",
    badge: "bg-emerald-100 text-emerald-700",
  },
  status: {
    dot: "bg-amber-500",
    label: "Status",
    badge: "bg-amber-100 text-amber-700",
  },
  communication: {
    dot: "bg-sky-500",
    label: "Komunikasi",
    badge: "bg-sky-100 text-sky-700",
  },
  completed: {
    dot: "bg-green-600",
    label: "Selesai",
    badge: "bg-green-100 text-green-700",
  },
  note: {
    dot: "bg-violet-500",
    label: "Catatan",
    badge: "bg-violet-100 text-violet-700",
  },
  external: {
    dot: "bg-rose-500",
    label: "Eksternal",
    badge: "bg-rose-100 text-rose-700",
  },
};

function formatTimestamp(ts: string | number): string {
  const ms = typeof ts === "number" ? ts : Date.parse(String(ts));
  if (Number.isNaN(ms)) return String(ts);
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function visibleItemsForPerspective(
  items: ActivityEntry[],
  perspective: WorkRealityPerspective
): ActivityEntry[] {
  if (perspective === "customer") {
    return items.filter((it) => it.type !== "note");
  }
  return items;
}

export interface RealityActivityProps {
  activity: ActivityEntry[];
  perspective: WorkRealityPerspective;
  workId: string;
}

export function RealityActivity({
  activity,
  perspective,
  workId,
}: RealityActivityProps) {
  const title = PERSPECTIVE_TITLES[perspective];
  const visible = visibleItemsForPerspective(activity ?? [], perspective);

  return (
    <section
      aria-labelledby={`activity-${workId}-title`}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2
            id={`activity-${workId}-title`}
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Urutan peristiwa yang tercatat untuk pekerjaan ini.
          </p>
        </div>
        <div className="hidden text-xs text-slate-400 sm:block">
          {visible.length} entri
        </div>
      </div>

      <ol
        role="list"
        className="mt-6 space-y-5 border-l border-slate-200 pl-6"
      >
        {visible.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Belum ada aktivitas yang tercatat.
          </li>
        )}
        {visible.map((entry) => {
          const style =
            TYPE_STYLES[entry.type] ?? TYPE_STYLES.note;
          return (
            <li
              key={entry.id}
              id={`activity-${workId}-${entry.id}`}
              className="relative"
            >
              <span
                className={`absolute -left-[29px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${style.dot}`}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
                >
                  {style.label}
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {entry.title}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              {(entry.description || entry.actor) && (
                <div className="mt-1.5 text-sm text-slate-600">
                  {entry.actor && (
                    <span className="mr-2 font-medium text-slate-700">
                      {entry.actor}
                    </span>
                  )}
                  {entry.description && <span>{entry.description}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default RealityActivity;