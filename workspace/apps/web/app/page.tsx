import React from "react";
import Link from "next/link";
import ProfessionalWorkspaceIntro from "../components/ProfessionalWorkspaceIntro";
import WorkspaceEntryPanel from "../components/WorkspaceEntryPanel";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Professional Workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Turn incoming requests into clear, delivery-ready requirements.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Give delivery, operations, and client-facing teams one place to
                capture what needs to be done, assign ownership, and track each
                requirement from draft to verified completion.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                href="/requirements"
              >
                Try Requirement Workspace
              </Link>
            </div>
          </div>
        </header>

        <ProfessionalWorkspaceIntro />
        <WorkspaceEntryPanel />
      </div>
    </main>
  );
}
