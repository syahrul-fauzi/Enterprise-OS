import React from "react";
import Link from "next/link";

export function ProfessionalWorkspaceIntro() {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-indigo-200 bg-white/90 px-3 py-1 text-xs font-semibold text-indigo-700">
              Professional Workspace
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Capture requirements, align owners, and move work forward.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                A focused workspace for teams that need to turn incoming requests
                into clear, actionable requirements without losing ownership,
                delivery status, or verification history.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
              href="/"
            >
              Overview
            </Link>
            <Link
              className="rounded-xl bg-slate-950 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800"
              href="/requirements"
            >
              Open Requirement Workspace
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Best For
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Teams handling client requests, delivery scoping, and approval-ready
            work intake.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            What You Can Do
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Create, review, update, and advance requirements from draft to
            verified delivery.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Start Here
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Open the Requirement workspace, add the first request, then track it
            as it moves toward delivery readiness.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ProfessionalWorkspaceIntro;
