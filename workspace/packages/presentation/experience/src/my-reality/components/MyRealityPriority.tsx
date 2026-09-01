"use client";

import type { MyRealityModel, RealityWorkItem } from '../contracts/my-reality.contracts';

interface MyRealityPriorityProps {
  model: MyRealityModel;
  onNextActionExecute?: (actionId: string, workId?: string) => void | Promise<void>;
}

const PRIORITY_STYLES = {
  now: {
    label: "NOW",
    subtitle: "Butuh perhatian dan tindakan Anda SEKARANG",
    labelBg: "bg-status-danger text-status-dangerForeground border-status-danger/70 ring-2 ring-status-danger/20 ring-offset-1 ring-offset-surface shadow-token-sm",
    accentBorder: "border-l-status-danger",
    cardBg: "bg-surface-elevated",
    cardBorder: "border-surface-border border-status-danger/30",
    titleText: "text-text-primary",
    cardShadow: "shadow-token-md",
    cardScale: "",
    headerBg: "bg-surface-elevated border-status-danger/30",
    headerShadow: "shadow-token-lg",
    counterText: "text-status-danger",
  },
  next: {
    label: "NEXT",
    subtitle: "Kelanjutan penting segera",
    labelBg: "bg-status-info/10 text-status-info border-status-info/40 ring-2 ring-status-info/10 ring-offset-1 ring-offset-surface",
    accentBorder: "border-l-status-info",
    cardBg: "bg-surface-elevated",
    cardBorder: "border-surface-border",
    titleText: "text-text-primary",
    cardShadow: "shadow-token-sm",
    cardScale: "",
    headerBg: "bg-surface-elevated border-surface-border/80",
    headerShadow: "shadow-token-md",
    counterText: "text-status-info",
  },
  watching: {
    label: "WATCHING",
    subtitle: "Belum butuh tindakan",
    labelBg: "bg-surface text-text-muted border-surface-border/80 ring-2 ring-surface-border/30 ring-offset-1 ring-offset-surface",
    accentBorder: "border-l-surface-border",
    cardBg: "bg-surface-sunken",
    cardBorder: "border-surface-border/70",
    titleText: "text-text-secondary",
    cardShadow: "shadow-token-xs",
    cardScale: "",
    headerBg: "bg-surface-sunken border-surface-border/60",
    headerShadow: "shadow-token-xs",
    counterText: "text-text-muted",
  },
} as const;

function PriorityRow({
  work,
  priority,
}: {
  work: RealityWorkItem;
  priority: keyof typeof PRIORITY_STYLES;
}) {
  const styles = PRIORITY_STYLES[priority];

  return (
    <a
      href={work.href}
      data-testid={`work-item-${work.workId}`}
      className={`block ${styles.cardBg} border ${styles.cardBorder} ${styles.cardShadow} rounded-xl p-4 sm:p-5 transition-all hover:scale-[1.015] hover:border-slate-300 border-l-4 ${styles.accentBorder}`}
      aria-label={`${work.title}. ${work.description ?? ""}. Tekan untuk buka pekerjaan.`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {work.platform && (
              <span
                className="bg-surface-sunken text-text-secondary px-2.5 py-0.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 border border-surface-border/50"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
                {work.platform.name}
              </span>
            )}
            {work.bottleneck && (
              <span className="bg-status-danger/10 text-status-danger px-2.5 py-0.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 border border-status-danger/20" role="status" aria-live="polite">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-danger animate-pulse" aria-hidden="true" />
                {work.bottleneck.label}
              </span>
            )}
          </div>

          <h4 className={`font-semibold ${styles.titleText} leading-snug`}>
            {work.title}
          </h4>
          {work.description && priority !== "watching" && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">
              {work.description}
            </p>
          )}

          {work.nextAction && (
            <div className="mt-3 inline-flex items-center gap-2 bg-status-info/10 text-status-info px-3 py-1.5 rounded-lg text-xs font-medium border border-status-info/20">
              <svg className="w-3.5 h-3.5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {work.nextAction.label}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-text-muted mt-1" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  );
}

function PrioritySectionHeader({
  priority,
  count,
  countAriaLabel,
}: {
  priority: keyof typeof PRIORITY_STYLES;
  count: number;
  countAriaLabel: string;
}) {
  const styles = PRIORITY_STYLES[priority];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <span className={`${styles.labelBg} border-2 px-3 py-1 rounded-full text-sm font-black tracking-widest uppercase shrink-0`} role="heading" aria-level={3} aria-label={`Priority ${styles.label}`}>
          <span className="sr-only">Prioritas </span>
          {styles.label}
        </span>
        <p className="text-sm sm:text-base font-semibold text-text-primary min-w-0 truncate">
          {styles.subtitle}
        </p>
      </div>
      <div className="sm:ml-auto" aria-live="polite" aria-atomic="true">
        <div className={`inline-flex items-center gap-2 bg-surface/80 border border-surface-border/60 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 shadow-token-sm`}>
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <div className="flex flex-col items-start leading-none">
            <span className={`text-xl sm:text-2xl font-black tabular-nums ${styles.counterText}`} aria-label={countAriaLabel}>
              {count}
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-text-muted mt-1 font-medium">
              pekerjaan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyRealityPriority({ model }: MyRealityPriorityProps) {
  const { now, next, watching } = model.priority;
  
  return (
    <div className="space-y-6 w-full" role="region" aria-label="Prioritas pekerjaan">
      <section aria-labelledby="priority-now-heading" className={`border-2 ${PRIORITY_STYLES.now.headerBg} ${PRIORITY_STYLES.now.headerShadow} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 w-full min-w-0 relative overflow-hidden border-l-4 ${PRIORITY_STYLES.now.accentBorder}`}>
        <span id="priority-now-heading" className="sr-only">Pekerjaan prioritas tinggi NOW — butuh perhatian dan tindakan Anda SEKARANG</span>
        <div className="mb-3 sm:mb-4">
          <PrioritySectionHeader priority="now" count={now.length} countAriaLabel={`${now.length} pekerjaan membutuhkan tindakan segera`} />
        </div>
        {now.length === 0 ? (
          <div className="bg-surface-elevated rounded-2xl p-6 sm:p-8 border border-status-success/30 text-center shadow-token-md">
            <div className="w-14 h-14 rounded-full bg-status-success/10 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <svg className="w-7 h-7 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-2">
              Tidak ada pekerjaan yang membutuhkan tindakan Anda saat ini.
            </h3>
            <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8 max-w-2xl mx-auto">
              ✓ Semua pekerjaan aktif sedang berjalan normal. Semua bottleneck sudah teratasi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a
                href="/work/start"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-primary text-text-inverse rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Mulai pekerjaan baru
                <svg className="w-5 h-5 ml-2" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </a>
              <a
                href="/work"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-surface border-2 border-surface-border text-text-primary rounded-xl font-semibold hover:bg-surface-sunken transition-colors"
              >
                Lihat semua pekerjaan
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0" role="list" aria-label={`Daftar ${now.length} pekerjaan prioritas NOW`}>
            {now.map((work) => (
              <div key={work.workId} role="listitem" className="w-full min-w-0">
                <PriorityRow work={work} priority="now" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NEXT Section */}
      <section aria-labelledby="priority-next-heading" className={`border-2 ${PRIORITY_STYLES.next.headerBg} ${PRIORITY_STYLES.next.headerShadow} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 w-full min-w-0 relative overflow-hidden border-l-4 ${PRIORITY_STYLES.next.accentBorder}`}>
        <span id="priority-next-heading" className="sr-only">Pekerjaan prioritas menengah NEXT — kelanjutan penting segera</span>
        <div className="mb-3 sm:mb-4">
          <PrioritySectionHeader priority="next" count={next.length} countAriaLabel={`${next.length} pekerjaan selanjutnya`} />
        </div>
        {next.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0" role="list" aria-label={`Daftar ${next.length} pekerjaan prioritas NEXT`}>
            {next.map((work) => (
              <div key={work.workId} role="listitem" className="w-full min-w-0">
                <PriorityRow work={work} priority="next" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WATCHING Section */}
      <section aria-labelledby="priority-watching-heading" className={`border-2 ${PRIORITY_STYLES.watching.headerBg} ${PRIORITY_STYLES.watching.headerShadow} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 w-full min-w-0 relative overflow-hidden border-l-4 ${PRIORITY_STYLES.watching.accentBorder}`}>
        <span id="priority-watching-heading" className="sr-only">Pekerjaan dalam pantauan WATCHING — belum butuh tindakan</span>
        <div className="mb-3 sm:mb-4">
          <PrioritySectionHeader priority="watching" count={watching.length} countAriaLabel={`${watching.length} pekerjaan dalam pantauan`} />
        </div>
        {watching.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0" role="list" aria-label={`Daftar ${watching.length} pekerjaan dalam pantauan WATCHING`}>
            {watching.map((work) => (
              <div key={work.workId} role="listitem" className="w-full min-w-0">
                <PriorityRow work={work} priority="watching" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}