import type { DataSourceInfo } from "../_lib/registry-client";

export function DataSourceBadge({ dataSource }: { dataSource: DataSourceInfo }) {
  const verified = dataSource.verified;

  return (
    <div className={`p-3 rounded-lg border ${
      verified
        ? "border-emerald-800 bg-emerald-950/10"
        : "border-amber-800 bg-amber-950/10"
    }`}>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <p className="text-xs font-mono uppercase tracking-wider text-neutral-500">
          Sumber Data
        </p>
        <span className={`px-2.5 py-1 rounded-md text-xs font-mono ${
          verified
            ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
            : "bg-amber-900/40 text-amber-300 border border-amber-800"
        }`}>
          {verified ? "VERIFIED · Registry Runtime" : "NOT PROVEN · Static Fallback"}
        </span>
      </div>
      <div className="space-y-1">
        {verified ? (
          <>
            <p className="text-xs text-neutral-300">
              <span className="font-mono text-neutral-500">Path:</span>{" "}
              <code className="text-sky-400">{dataSource.registryPath}</code>
            </p>
            {dataSource.generatedAt && (
              <p className="text-xs text-neutral-300">
                <span className="font-mono text-neutral-500">Generated:</span>{" "}
                {new Date(dataSource.generatedAt).toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-neutral-300">
              <span className="font-mono text-neutral-500">Fallback:</span>{" "}
              <code className="text-amber-400">{dataSource.fallbackSource}</code>
            </p>
            <p className="text-xs text-amber-300/80 italic">
              ⚠️ Data ini berasal dari model statis. Registry projection belum tersedia.
            </p>
          </>
        )}
      </div>
    </div>
  );
}