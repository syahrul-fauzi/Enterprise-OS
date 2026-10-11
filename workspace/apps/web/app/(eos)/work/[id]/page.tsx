// FACE Replacement Test H - Active Work Detail Page
// This is the new FACE implementation activated for Test H (FACE Replacement)
// Work remains invariant: same workId used across both trace/ and this detail page
// Rule of Two compliance: reuses session logic from trace/page.tsx and buildWorkRealityModel from getWorkRealityModel.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GlobalNavigation } from "@repo/web-ui";
import { WorkDetailPage } from "@repo/presentation-web";
import { decodeWorkspaceSession } from "../../../../../../lib/workspace-session";
import { WORKSPACE_SESSION_COOKIE } from "../../../../../../lib/constants";
import { buildWorkRealityModel, CanonicalWorkRecord } from "./getWorkRealityModel";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { provideLawyersHubContext } from "../../../../../../../../products/lawyershub/runtime/product-context-provider.js";

// Work detail route props (Next.js App Router pattern)
interface WorkDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function WorkDetailRoute({ params }: WorkDetailRouteProps) {
  const { id } = await params;

  // 1. Session validation (reuses session logic from trace/page.tsx - Rule of Two compliance)
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  let session;
  if (sessionCookie?.value) {
    try {
      session = decodeWorkspaceSession(sessionCookie.value);
    } catch {
      session = { 
        sessionId: "anonymous-session", 
        actorId: "anonymous.user", 
        actorLabel: "Pengguna Publik", 
        tenantId: "tenant.anonymous", 
        workspaceId: "professional-workspace.anonymous",
        userCapabilities: [],
        productId: "lawyershub"
      };
    }
  } else {
    session = { 
      sessionId: "anonymous-session", 
      actorId: "anonymous.user", 
      actorLabel: "Pengguna Publik", 
      tenantId: "tenant.anonymous", 
      workspaceId: "professional-workspace.anonymous",
      userCapabilities: [],
      productId: "lawyershub"
    };
  }

  // 2. Load canonical work record from database (real server-side data fetch)
  // In production, this would fetch from your canonical work repository
  let canonicalWork: CanonicalWorkRecord;
  try {
    // Mock canonical work data - in production, fetch from your DB
    canonicalWork = {
      workId: id,
      id: id,
      title: "Test Legal Case - FACE Replacement",
      description: "This work is used to verify that Work remains invariant when FACE is replaced. Aligns with Work Continuity Matrix Test H.",
      linkedIntentId: "intent-verify-face-continuity",
      domainType: "legal",
      specialization: "litigation",
      status: "in_progress",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: "medium",
      lawyerId: "lawyer-john-doe-001",
      providerId: "provider-legalcorp-001",
      platformSource: "web",
      platformMetadata: { source: "FACE Replacement Test H" },
      hasBottleneck: false,
      nextAction: { label: "Review case details", actionId: "action-review-case" },
      evidence: [{ id: "ev-001", type: "document", title: "Case Complaint", uploadedAt: new Date().toISOString() }],
      participants: [{ id: "actor-customer-001", name: "Customer John", role: "Pemohon", actorType: "human", email: "customer@example.com" }],
      linkedInstitutions: [{ id: "inst-legalcorp-001", name: "LegalCorp", role: "Provider" }],
      attachedDocuments: [{ id: "doc-001", title: "Identity Document", type: "pdf" }]
    };
  } catch (err) {
    console.error(`[WorkDetailRoute] Failed to load canonical work ${id}:`, err);
    redirect("/work");
  }

  // 3. Build server-side WorkRealityModel (reuses getWorkRealityModel.ts - only server may derive state)
  const workRealityModel = await buildWorkRealityModel(canonicalWork, [], session);

  // 4. Breadcrumb items (reuses pattern from trace/page.tsx - navigation continuity)
  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Work", href: "/work" },
    { label: `Work ${id.substring(0, 8)}...`, href: `/work/${id}`, current: true },
  ];

  // 5. Read product binding and LawyersHub context (reuses existing product binding logic - Rule of Two compliance)
  const binding = readProductBinding("lawyershub");
  const lawyersHubContext = provideLawyersHubContext(); // Pass request headers if white-labeling is needed

  // 6. Render FACE with canonical model (client receives only precomputed reality model)
  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId={session.productId || "default"}
      breadcrumbItems={breadcrumbItems}
    >
      <WorkDetailPage 
        workId={id} 
        session={session} 
        binding={binding}
        workRealityModel={workRealityModel}
        eSignEnabled={lawyersHubContext.features.eSignIntegration}
        onExecuteAction={async (actionId: string, formData?: FormData) => {
          // SIG-NEXT-001-W8: Handle "Handoff to ILC" action (lawyershub→ilc cross-product handoff)
          if (actionId === "handoff-to-ilc") {
            try {
              const response = await fetch("/api/work/link-existing", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  workId: id,
                  domainType: "institutional-coordination",
                  sessionId: session.sessionId,
                  tenantId: session.tenantId,
                  workspaceId: session.workspaceId,
                  actorId: session.actorId,
                  targetProductId: "ilc", // Target product for handoff
                  domainSpecificData: {
                    handoffSource: "lawyershub",
                    handoffTarget: "ilc",
                    handoffTimestamp: new Date().toISOString()
                  }
                }),
              });

              const result = await response.json();
              if (result.success) {
                // Redirect to ILC workspace work page after successful handoff
                window.location.href = `/ilc/work/${id}`;
              } else {
                console.error("[Handoff to ILC] Failed:", result.error);
                alert(`Gagal melakukan handoff ke ILC: ${result.error}`);
              }
            } catch (error) {
              console.error("[Handoff to ILC] Error:", error);
              alert("Terjadi kesalahan saat melakukan handoff ke ILC. Silakan coba lagi.");
            }
          }
          // RES-001-001-W1: Handle "Handoff to Paralegal" action (lawyershub cross-actor handoff)
          if (actionId === "handoff-to-paralegal") {
            try {
              // Target paralegal workspace - same tenant, paralegal workspace ID
              const targetWorkspaceId = "paralegal-workspace.anonymous";
              const response = await fetch("/api/work/link-existing", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  workId: id,
                  domainType: "legal-case-paralegal",
                  sessionId: session.sessionId,
                  tenantId: session.tenantId,
                  workspaceId: session.workspaceId, // Source workspace (lawyer's)
                  actorId: session.actorId,
                  targetWorkspaceId: targetWorkspaceId, // Target paralegal workspace
                  domainSpecificData: {
                    handoffSource: "lawyer-workspace",
                    handoffTarget: "paralegal-workspace",
                    newNextAction: "File trademark documents",
                    handoffTimestamp: new Date().toISOString()
                  }
                }),
              });

              const result = await response.json();
              if (result.success) {
                // Refresh page to show updated work state in paralegal workspace
                window.location.href = `/work/${id}?workspace=${targetWorkspaceId}`;
              } else {
                console.error("[Handoff to Paralegal] Failed:", result.error);
                alert(`Gagal melakukan handoff ke Paralegal: ${result.error}`);
              }
            } catch (error) {
              console.error("[Handoff to Paralegal] Error:", error);
              alert("Terjadi kesalahan saat melakukan handoff ke Paralegal. Silakan coba lagi.");
            }
          }
        }}
      />
    </GlobalNavigation>
  );
}