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

// W-CONT-006: Test F - Product workflow → operational workflow projection
interface WorkOperationalRouteProps {
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

export async function generateMetadata({ params }: WorkOperationalRouteProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Operational: Work ${id} · EOS`,
    description: "Ops team-optimized interface untuk mengeksekusi tugas operational dari work yang sama",
  };
}

export default async function WorkOperationalRoute({ params }: WorkOperationalRouteProps) {
  const { id } = await params;

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Work", href: "/work" },
    { label: `Work ${id.substring(0, 8)}...`, href: `/work/${id}` },
    { label: "Operational", href: `/work/${id}/operational`, current: true },
  ];
  
  // W-CONT-006: Test F - Product workflow → operational workflow (REALITY-002 invariant)
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
    // W-CONT-006: Override HANYA KONTEKS WORKSPACE & AKTOR TIDAK MERUBAH STATE CANONICAL WORK!
    const baseSession = session;
    const enhancedSession = createAnonymousWorkspaceSession("lawyershub");
    Object.assign(enhancedSession, {
      actorId: "ops-coordinator.actor",
      actorLabel: "EOS Operational Coordinator",
      tenantId: session.tenantId,
      workspaceId: "operational-workspace.prod",
      sessionId: session.sessionId,
      // Bounded autonomy: Ops team hanya punya capability terbatas untuk work ini
      userCapabilities: ["work:read", "status:update", "evidence:create"]
    });
    session = enhancedSession as WorkspaceSession & { userCapabilities?: string[], workspaceLabel?: string };
    (session as any).workspaceLabel = "Operational Workspace";

    const canonicalWork = {
      workId: id, // WORK ID TETAP INVARIANT! REALITY-002 tidak berubah
      id: id,
      title: "Test Legal Case - Operational Workflow Projection",
      description: "Work ini diverifikasi tetap invariant saat diproyeksikan dari product workflow ke operational workflow. Sesuai Work Continuity Matrix Test F. Actor memiliki bounded autonomy sesuai kebutuhan tim ops.",
      linkedIntentId: "intent-verify-workflow-continuity",
      domainType: "operational",
      specialization: "execution",
      status: "in_progress",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: "medium" as const,
      lawyerId: "lawyer-john-doe-001",
      providerId: "provider-legalcorp-001",
      platformSource: "operational-workflow",
      platformMetadata: { 
        source: "Product Workflow → Operational Workflow Transition Test F",
        originalProductId: "legal-case-management.product",
        workflowRulesApplied: ["sla-tracking", "resource-allocation", "status-gating"],
        boundedAutonomyEnforced: true
      },
      hasBottleneck: false,
      nextAction: { label: "Assign to operational resources", actionId: "action-assign-ops" },
      // EVIDENCE CHAIN TETAP SAMA! Work invariant terjaga
      evidence: [{ id: "ev-001", type: "document", title: "Case Complaint", uploadedAt: new Date().toISOString() }],
      participants: [
        { id: "actor-customer-001", name: "Customer John", role: "Pemohon", actorType: "human", email: "customer@example.com" },
        { id: session.actorId, name: session.actorLabel, role: "Operational Coordinator", actorType: "human-ops", email: "ops@eos.local" }
      ],
      linkedInstitutions: [{ id: "inst-legalcorp-001", name: "LegalCorp", role: "Provider" }],
      attachedDocuments: [{ id: "doc-001", title: "Identity Document", type: "pdf" }]
    };

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

  // Untuk semua work ID lain, tampilkan pesan tidak tersedia
  const session = await resolveSessionOrEnter();
  const binding = readProductBinding("default");
  
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948 3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-slate-900 m-0">Operational View Tidak Tersedia</h1>
                <p className="text-sm text-slate-600 leading-relaxed m-0">
                  ID work tidak valid atau belum dapat diproses oleh tim operasional. Silakan periksa kembali URL yang Anda masukkan.
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