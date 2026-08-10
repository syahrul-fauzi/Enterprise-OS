"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import { ProfessionalWorkspaceIntro, WorkspaceEntryPanel } from "@repo/presentation-widgets";

export default function RootRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const router = useRouter();
  const { loading, authenticated, session, error } = useWorkspaceSession();

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

function UnauthCTAGroup() {
  return (
    <>
      <Link
        className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        href="/signup"
      >
        Create Account
      </Link>
      <Link
        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 hover:border-slate-400"
        href="/login"
      >
        Sign In
      </Link>
    </>
  );
}

function AuthCTAGroup(props: {
  readonly actorLabel: string | null;
  readonly onLogout: () => void;
  readonly loggingOut: boolean;
}) {
  return (
    <>
      <Link
        className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        href="/requirements"
      >
        Enter Workspace
      </Link>
      <button
        type="button"
        onClick={props.onLogout}
        disabled={props.loggingOut}
        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {props.loggingOut ? "Signing out..." : "Sign Out"}
      </button>
    </>
  );
}