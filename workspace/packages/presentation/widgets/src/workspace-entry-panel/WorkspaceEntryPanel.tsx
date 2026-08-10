"use client";

import React from "react";

interface WorkspaceEntryPanelProps {
  readonly loading: boolean;
  readonly authenticated: boolean;
  readonly actorLabel: string | null;
  readonly error: string | null;
}

export function WorkspaceEntryPanel({
  loading,
  authenticated,
  actorLabel,
  error,
}: WorkspaceEntryPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3">
        <div>
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Workspace Ready
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950">
            Start in a prepared workspace session
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The workspace prepares your session in the background so you can
            move straight into requirement intake, review, and delivery tracking.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <div className="font-semibold">Workspace setup needs attention</div>
            <p className="mt-1">{error}</p>
          </div>
        ) : !loading && authenticated ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active Operator
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {actorLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Workspace
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  Requirement workspace
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Session Status
                </div>
                <div className="mt-2 text-sm font-medium text-emerald-700">
                  Ready for live testing
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Active Operator
              </div>
              <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-slate-200"></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </div>
              <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-slate-200"></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Session Status
              </div>
              <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-slate-200"></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}