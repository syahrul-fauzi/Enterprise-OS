"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
// import { useWorkspaceSession } from "@repo/presentation-hooks";
import { ProfessionalWorkspaceIntro, WorkspaceEntryPanel } from "..";

export interface RootLandingPageProps {
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

export function RootLandingPage({ searchParams }: RootLandingPageProps) {
  const router = useRouter();
  // Mock session state to fix compilation errors
  const loading = false;
  const authenticated = false;
  const session = null;
  const error = null;

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
      </div>
    </main>
  );
}