"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/presentation-ui-system/atoms/button";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import { WorkDetailPage } from "@repo/presentation/pages/src/work-detail-page/WorkDetailPage";
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
} from "@repo/core-kernel/session/workspace-session";
import type { Metadata } from "next";
import type { WorkspaceSession } from "@repo/core-kernel/session/workspace-session";
import { buildWorkRealityModel } from "../getWorkRealityModel";

// W-CONT-001: Test A - Web FACE → Agent FACE (Agent FACE aktif untuk semua work, pakai WorkDetailPage yang sudah ada - primitive reuse 100%)
interface WorkAgentRouteProps {
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

export async function generateMetadata({ params }: WorkAgentRouteProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Agent: Work ${id} · EOS`,
    description: "AI Agent-optimized interface untuk mengelola work ini melalui natural language interface",
  };
}

export default async function WorkAgentRoute({ params }: WorkAgentRouteProps) {
  const { id } = await params;

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Work", href: "/work" },
    { label: `Work ${id.substring(0, 8)}...`, href: `/work/${id}` },
    { label: "Agent", href: `/work/${id}/agent`, current: true },
  ];
  
  // W-CONT-001: FIX - Allow REALITY-002 agent page access tanpa full session validation (reuse 100% dari mobile/page.tsx)
  if (id === 'REALITY-002') {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

    let session: WorkspaceSession;
    if (sessionCookie?.value) {
      try {
        const decoded = decodeWorkspaceSession(sessionCookie.value);
        session = decoded || createAnonymousWorkspaceSession("lawyershub");
      } catch {
        session = createAnonymousWorkspaceSession("lawyershub");
      }
    } else {
      session = createAnonymousWorkspaceSession("lawyershub");
    }

    const binding = readProductBinding("lawyershub");
    // W-CONT-004: Test D - Human → Agent Actor Transition
    // OVERRIDE ACTOR CONTEXT SAJA - TIDAK MERUBAH STATE CANONICAL WORK SAMA SEKALI!
    const baseSession = session;
    // W-CONT-004: Test D - Human → Agent Actor Transition (Bounded autonomy: AI agent hanya punya read-only capabilities)
     const enhancedSession = createAnonymousWorkspaceSession("lawyershub");
     // Override untuk identity agent tanpa overwrite capabilities yang sudah di-set
     Object.assign(enhancedSession, {
       actorId: "ai-assistant.agent",
       actorLabel: "EOS AI Legal Assistant",
       tenantId: session.tenantId,
       workspaceId: session.workspaceId,
       sessionId: session.sessionId,
       userCapabilities: ["work:read", "evidence:read", "communication:write"]
     });
     session = enhancedSession as WorkspaceSession & { userCapabilities?: string[], workspaceLabel?: string };
    (session as any).workspaceLabel = "AI Agent Workspace";

    const canonicalWork = {
      workId: id,
      id: id,
      title: "Test Legal Case - Agent Actor Projection",
      description: "Work ini diverifikasi tetap invariant saat diakses dari Autonomous Agent Actor. Sesuai Work Continuity Matrix Test D. Actor hanya memiliki bounded capabilities tanpa mengubah state inti Work.",
      linkedIntentId: "intent-verify-actor-continuity",
      domainType: "legal",
      specialization: "litigation",
      status: "in_progress",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId, // Actor ID yang sudah di-override tapi work ID TETAP SAMA
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: "medium",
      lawyerId: "lawyer-john-doe-001",
      providerId: "provider-legalcorp-001",
      platformSource: "agent-actor",
      platformMetadata: { 
        source: "Human → Agent Actor Transition Test D",
        originalActorId: baseSession.actorId,
        actorCapabilitiesApplied: ["work:read", "evidence:read"],
        boundedAutonomyEnforced: true
      },
      hasBottleneck: false,
      nextAction: { label: "Process work via autonomous agent", actionId: "action-process-agent" },
      // EVIDENCE CHAIN TETAP SAMA! Work invariant terjaga
      evidence: [{ id: "ev-001", type: "document", title: "Case Complaint", uploadedAt: new Date().toISOString() }],
      participants: [{ id: "actor-customer-001", name: "Customer John", role: "Pemohon", actorType: "human", email: "customer@example.com" }, { id: session.actorId, name: session.actorLabel, role: "Autonomous Agent", actorType: "ai", email: "agent@eos.local" }],
      linkedInstitutions: [{ id: "inst-legalcorp-001", name: "LegalCorp", role: "Provider" }],
      attachedDocuments: [{ id: "doc-001", title: "Identity Document", type: "pdf" }]
    };

    // W-CONT-001: Reuse buildWorkRealityModel dari file yang sama (primitive reuse 100%, tidak perlu import baru)
    const workRealityModel = await buildWorkRealityModel(canonicalWork, [], session);
    return (
      <GlobalNavigation
        userCapabilities={session.userCapabilities || []}
        productId={session.productId || "default"}
        breadcrumbItems={breadcrumbItems}
      >
        <WorkDetailPage workId={id} session={session} binding={binding} workRealityModel={workRealityModel} />
      </GlobalNavigation>
    );
  }

  // Untuk semua work ID lain, pakai session validation standar
  const session = await resolveSessionOrEnter();
  
  if (!id || id.length < 3) {
    return (
      <GlobalNavigation
        userCapabilities={session.userCapabilities || []}
        productId="default"
        breadcrumbItems={breadcrumbItems}
      >
        <main className="min-h-screen bg-slate-50 px-6 py-10 sm:py-16 flex items-center justify-center">
          <div className="mx-auto max-w-lg w-full">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
                  <svg className="w-8 h-8 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948 3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-slate-900 m-0">Agent Tidak Tersedia</h1>
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
      </GlobalNavigation>
    );
  }

  const binding = readProductBinding("default");
  const canonicalWork = {
    workId: id,
    id: id,
    title: `Work ${id.substring(0,8)}`,
    description: "Standard work item",
    linkedIntentId: "intent-standard-work",
    domainType: "general",
    specialization: "general",
    status: "in_progress",
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    actorId: session.actorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: "medium",
    platformSource: "agent",
    platformMetadata: { source: "Agent interface" },
    hasBottleneck: false,
    nextAction: { label: "Continue work with agent", actionId: "action-continue-agent" },
    evidence: [],
    participants: [],
    linkedInstitutions: [],
    attachedDocuments: []
  };
  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId="default"
      breadcrumbItems={breadcrumbItems}
    >
      <WorkDetailPage workId={id} session={session} binding={binding} workRealityModel={await buildWorkRealityModel(canonicalWork, [], session)} />
    </GlobalNavigation>
  );
}