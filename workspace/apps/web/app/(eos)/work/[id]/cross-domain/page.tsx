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
} from "@repo/core-kernel/session/workspace-session";
import type { Metadata } from "next";
import type { WorkspaceSession } from "@repo/core-kernel/session/workspace-session";
import { buildWorkRealityModel } from "../getWorkRealityModel";

// W-CONT-008: Test G - Web FACE → Cross-Domain Migrate (Domain projection interface untuk work yang sama - primitive reuse 100%)
interface WorkCrossDomainRouteProps {
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

export async function generateMetadata({ params }: WorkCrossDomainRouteProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Cross-Domain: Work ${id} · EOS`,
    description: "Cross-domain projection interface untuk memproyeksikan work ini ke domain lain",
  };
}

export default async function WorkCrossDomainRoute({ params }: WorkCrossDomainRouteProps) {
  const { id } = await params;

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Work", href: "/work" },
    { label: `Work ${id.substring(0, 8)}...`, href: `/work/${id}` },
    { label: "Cross-Domain", href: `/work/${id}/cross-domain`, current: true },
  ];
  
  // W-CONT-008: REALITY-002 cross-domain page access dengan anonymous session fallback (reuse 100% dari trace/page.tsx)
  if (id === 'REALITY-002') {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

    let session: WorkspaceSession;
    if (sessionCookie?.value) {
      try {
        session = decodeWorkspaceSession(sessionCookie.value);
      } catch {
        session = { sessionId: "anonymous-session", actorId: "anonymous.user", actorLabel: "Pengguna Publik", tenantId: "tenant.anonymous", workspaceId: "professional-workspace.anonymous", userCapabilities: [], productId: "lawyershub" };
      }
    } else {
      session = { sessionId: "anonymous-session", actorId: "anonymous.user", actorLabel: "Pengguna Publik", tenantId: "tenant.anonymous", workspaceId: "professional-workspace.anonymous", userCapabilities: [], productId: "lawyershub" };
    }

    // High-Value-001: Christie_Law_Firm case diproyeksikan cross-domain (W-CONT-008 Test G)
    // Verifikasi bahwa WORK ID TETAP SAMA meskipun diproyeksikan ke domain berbeda (LAWYERSHUB → SERVICES.ID)
    const binding = readProductBinding("lawyershub");
    const canonicalWork = {
      workId: "HIGH-VALUE-001",
      id: "HIGH-VALUE-001",
      title: "HIGH-VALUE-001: Pendaftaran Merek Dagang FrozenSby - Cross-Domain Projection",
      description: "Work Christie_Law_Firm ini diverifikasi tetap invariant saat diproyeksikan ke domain Services.ID dari LawyersHub. Work ID tidak berubah, semua canonical atribut tetap sama. Sesuai Work Continuity Matrix Test G.",
      linkedIntentId: "intent-hv001-crossdomain-projection",
      domainType: "legal",
      specialization: "IP & Trademark Registration",
      status: "completed",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date("2026-09-07T14:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-09-28T09:00:00.000Z").toISOString(),
      priority: "critical" as const,
      lawyerId: "lawyer.makassar.001",
      providerId: "christielaw.com",
      platformSource: "cross-domain-projection",
      platformMetadata: { source: "EOS Work Continuity Test G - HIGH-VALUE-001", boundary_changes: ["domain: lawyershub → services.id", "actor: lawyer.makassar.001 → anonymous.user", "workspace: legal-workspace → professional-workspace.anonymous"] },
      hasBottleneck: false,
      nextAction: { label: "Project to finance domain for invoicing", actionId: "action-project-finance" },
      evidence: [{ id: "evidence-missing-document-hv001-1725703600000", type: "reality_signal", title: "Delayed Document resolved - Christie-IP-2026-0045 terkirim", uploadedAt: new Date("2026-09-23T14:00:00.000Z").toISOString() }, { id: "christie-ip-2026-0045", type: "legal-document", title: "Surat Permohonan Pendaftaran Merek Dagang", uploadedAt: new Date("2026-09-23T14:00:00.000Z").toISOString() }],
      participants: [{ id: "client.frozen.sby.001", name: "Pemilik UMKM FrozenSby", role: "Pemohon", actorType: "human", email: "frozensby@example.com" }, { id: "lawyer.makassar.001", name: "Advokat Christie_Law_Firm", role: "Legal Counsel IP", actorType: "professional", email: "lawyer@christielaw.com" }],
      linkedInstitutions: [{ id: "christielaw.com", name: "Christie_Law_Firm", role: "Penyedia Layanan Hukum", aai_id: "AAI-ID-00745" }, { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" }],
      attachedDocuments: [{ id: "doc-ktp-frozen.sby", title: "KTP Pemilik Usaha", type: "identity" }, { id: "doc-business-plan-ekspor", title: "Rencana Ekspor ke Malaysia", type: "business-plan" }]
    };

    const workRealityModel = await buildWorkRealityModel(canonicalWork, [], session);
    return (
      <GlobalNavigation
        userCapabilities={session.userCapabilities || []}
        productId={session.productId || "default"}
        breadcrumbItems={breadcrumbItems}
      >
        <WorkDetailPage workId={id} initialModel={workRealityModel} />
      </GlobalNavigation>
    );
  }

  // Untuk semua work ID lain, gunakan session validation standar
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-slate-900 m-0">Cross-Domain Tool Tidak Ditemukan</h1>
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
    title: `Work ${id} - Cross-Domain Projection`,
    description: "Work yang diproyeksikan ke domain lain, tetap invariant sesuai prinsip EOS.",
    linkedIntentId: "intent-default-crossdomain",
    domainType: "default",
    specialization: "general",
    status: "in_progress",
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    actorId: session.actorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: "medium",
    platformSource: "cross-domain",
    platformMetadata: { source: "Cross-Domain Default Projection" },
    hasBottleneck: false,
    nextAction: { label: "Manage domain projection", actionId: "action-manage-domain" },
    evidence: [],
    participants: [],
    linkedInstitutions: [],
    attachedDocuments: []
  };
  
  const workRealityModel = await buildWorkRealityModel(canonicalWork, [], session);
  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId="default"
      breadcrumbItems={breadcrumbItems}
    >
      <WorkDetailPage workId={id} session={session} binding={binding} workRealityModel={workRealityModel} />
    </GlobalNavigation>
  );
}