"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/presentation-ui-system";
import { WorkTracePage } from '@repo/presentation-widgets';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

interface WorkTraceRouteProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

async function resolveSessionOrEnter() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) redirect("/enter");
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    redirect("/enter");
  }
  return session;
}

export async function generateMetadata({ params }: WorkTraceRouteProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Trace: Work ${id} · EOS`,
    description: "End-to-end observable chain of work execution for this EOS work item",
  };
}

export default async function WorkTraceRoute({ params }: WorkTraceRouteProps) {
  const session = await resolveSessionOrEnter();
  const { id } = await params;
  
  if (!id || id.length < 3) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 sm:py-16 flex items-center justify-center">
        <div className="mx-auto max-w-lg w-full">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-8 h-8 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-slate-900 m-0">Trace Tidak Ditemukan</h1>
                <p className="text-sm text-slate-600 leading-relaxed m-0">
                  ID work tidak valid atau tidak dapat diproses. Silakan periksa kembali URL yang Anda masukkan.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full">
                <Link href={`/work/${id}`} className="w-full sm:w-auto">
                  <Button intent="primary" variant="solid" size="md" block>
                    Kembali ke Detail Work
                  </Button>
                </Link>
                <Link href="/workspace" className="w-full sm:w-auto">
                  <Button intent="neutral" variant="outline" size="md" block>
                    Ke Workspace
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <WorkTracePage workId={id} session={session} />;
}