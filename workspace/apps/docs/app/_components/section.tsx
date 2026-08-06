export function Section({
  title,
  eyebrow,
  children,
  className = "",
  id,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`mb-10 p-6 border border-neutral-800 rounded-xl bg-neutral-900/30 backdrop-blur-sm ${className}`}
    >
      {eyebrow ? (
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-xl font-bold mb-4 text-white border-b border-neutral-800 pb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-4 bg-neutral-800/40 border border-neutral-700/60 rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}

export function LabeledRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1.5 border-b border-neutral-800/70 last:border-b-0">
      <span className="text-xs font-mono text-neutral-500 sm:w-56 shrink-0">
        {label}
      </span>
      <div className="text-sm text-neutral-200">{value}</div>
    </div>
  );
}
