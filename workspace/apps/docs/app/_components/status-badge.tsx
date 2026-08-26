import { STATUS, type StatusValue } from "../_lib/eos-knowledge-model";

const isGreen = (s: string): boolean =>
  s.includes("✅") || s === STATUS.PROVEN || s.toLowerCase().includes("pass");
const isCyan = (s: string): boolean =>
  s === STATUS.IMPLEMENTED || s.toLowerCase().includes("implemented");
const isYellow = (s: string): boolean =>
  s.includes("🔶") ||
  s.includes("🔓") ||
  s === STATUS.PARTIAL ||
  s === STATUS.IMPLEMENTING ||
  s === STATUS.NOT_PROVEN ||
  s === STATUS.EXPERIMENTAL ||
  s.toLowerCase().includes("partial") ||
  s.toLowerCase().includes("implementing") ||
  s.toLowerCase().includes("not_proven");
const isRed = (s: string): boolean =>
  s.includes("🔒") || s === STATUS.LOCKED || s.toLowerCase().includes("locked");
const isBlue = (s: string): boolean =>
  s === STATUS.STABLE || s.toLowerCase().includes("stable");
const isGray = (s: string): boolean =>
  s === STATUS.UNVERIFIED || s.toLowerCase().includes("unverified");

export function StatusBadge({ status }: { status: StatusValue | string }) {
  const green = isGreen(status);
  const cyan = isCyan(status);
  const yellow = isYellow(status);
  const red = isRed(status);
  const blue = isBlue(status);
  const gray = isGray(status);

  const cls = green
    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
    : cyan
      ? "bg-cyan-900/40 text-cyan-300 border border-cyan-800"
      : yellow
        ? "bg-amber-900/40 text-amber-300 border border-amber-800"
        : red
          ? "bg-red-900/40 text-red-300 border border-red-800"
          : blue
            ? "bg-sky-900/40 text-sky-300 border border-sky-800"
            : gray
              ? "bg-neutral-800 text-neutral-400 border border-neutral-700"
              : "bg-neutral-800 text-neutral-300 border border-neutral-700";

  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap ${cls}`}
    >
      {status}
    </span>
  );
}