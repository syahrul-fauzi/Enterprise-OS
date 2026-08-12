"use client";
import React from "react";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import RequirementView from "../../../../capabilities/requirement-management/experience/views/RequirementView";
import { ProfessionalWorkspaceIntro, WorkspaceEntryPanel } from "@repo/presentation-widgets";
import { useRouter } from "next/navigation";

export default function RequirementsPage() {
  const router = useRouter();
  const { loading, authenticated, session, error } = useWorkspaceSession();

  if (!authenticated && !loading) {
    router.push("/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
    } finally {
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProfessionalWorkspaceIntro
          loading={loading}
          authenticated={authenticated}
          actorLabel={session?.actorLabel ?? null}
          onLogout={handleLogout}
        />
        <WorkspaceEntryPanel
          loading={loading}
          authenticated={authenticated}
          actorLabel={session?.actorLabel ?? null}
          error={error}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Requirement Workspace
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Capture, review, and move requirements toward delivery.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Use this workspace to record requests, assign owners, track
                progress, and confirm that work is ready to move forward with
                confidence.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Step 1
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  Create a requirement
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Step 2
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  Assign and review ownership
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Step 3
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  Advance delivery status
                </div>
              </div>
            </div>
          </div>
        </section>

        <RequirementView />
      </div>
    </main>
  );
}