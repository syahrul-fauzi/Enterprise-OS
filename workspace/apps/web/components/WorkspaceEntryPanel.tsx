"use client";

import React, { useEffect, useState } from "react";

interface SessionPayload {
  readonly authenticated: boolean;
  readonly session: {
    readonly actorId: string;
    readonly actorLabel: string;
    readonly tenantId: string;
    readonly workspaceId: string;
  };
  readonly request: {
    readonly requestId: string;
    readonly traceId: string;
    readonly intent: string;
  };
}

export function WorkspaceEntryPanel() {
  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json()) as { readonly detail?: string };
          throw new Error(body.detail ?? `Failed to load workspace session (${response.status})`);
        }
        return response.json() as Promise<SessionPayload>;
      })
      .then((result) => {
        if (active) {
          setPayload(result);
        }
      })
      .catch((raw) => {
        if (active) {
          setError(raw instanceof Error ? raw.message : String(raw));
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
        ) : payload ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active Operator
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {payload.session.actorLabel}
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

            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Technical session details
              </summary>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  Actor ID: {payload.session.actorId}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  Tenant: {payload.session.tenantId}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  Workspace ID: {payload.session.workspaceId}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  Request: {payload.request.requestId}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  Trace: {payload.request.traceId}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  Intent: {payload.request.intent}
                </div>
              </div>
            </details>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Preparing your workspace session...
          </div>
        )}
      </div>
    </section>
  );
}

export default WorkspaceEntryPanel;
