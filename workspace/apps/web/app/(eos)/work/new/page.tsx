// NON-GOLDEN-SPINE ROUTE - DISABLED PER W003-P7-03 POLICY
// This route is not part of the current Golden Spine release path and has been disabled
// to prevent compilation errors from unresolvable imports. It will be re-enabled only
// if it becomes part of the dependency closure of a future release path.
//
// Reason for disable: Contains import path error "@repo/capabilities-identity/repositories"
// which would cause Docker build to fail.
//
// Date disabled: 2026-09-19
//
// /*
// Server Component with client-boundary form section - separates session/intent resolution (server) from client-side submission
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NewWorkFormClient } from "./components/NewWorkFormClient";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import type { BreadcrumbItem } from "@repo/presentation-ui-system/molecules";

// Server-side intent retrieval - uses canonical repository primitive (no internal HTTP calls)
async function fetchIntentServerSide(
  intentId: string,
  session: any,
): Promise<any | null> {
  try {
    // Import canonical intent repository (lazy import to avoid circular dependencies)
    const { getIntentRepositoryPostgres, initIdentitySchema } = await import(
      "@repo/capabilities-identity/repositories"
    );

    await initIdentitySchema();
    const intentRepository = getIntentRepositoryPostgres();
    const intentAggregate = await intentRepository.byId(intentId, {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
    });

    if (!intentAggregate) return null;

    // Map IntentAggregate to a presentation-compatible object
    return {
      id: intentAggregate.id,
      resolution: intentAggregate.resolution,
      status: intentAggregate.status,
      category: intentAggregate.category,
      createdAt: intentAggregate.createdAt.toISOString(),
      updatedAt: intentAggregate.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error(
      "[SERVER] Error fetching intent via canonical repository:",
      error,
    );
    return null;
  }
}

export default async function NewWorkPage({
  searchParams,
}: {
  searchParams: { intentId?: string };
}) {
  // Server-side session check - identical pattern to MyReality reference
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    redirect("/");
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  if (!session) {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  // Extract intentId from searchParams server-side (optional)
  const { intentId } = searchParams;
  let intent: any | null = null;

  // If intentId exists, fetch intent data (Mode B: Intent-derived Work)
  if (intentId) {
    intent = await fetchIntentServerSide(intentId, session);
    if (!intent) {
      redirect("/intent/new");
    }
  }

  // Work creation callback executed server-side, maintains separation of concerns
  const handleWorkCreation = async (formData: {
    title: string;
    objective: string;
    description: string;
  }) => {
    "use server";
    try {
      // Import canonical universal expression pipeline (single canonical ingress for ALL reality sources)
      // Implements user's requirement: ALL reality sources use same canonical ingress path
      // Re-enabled for W004-P3-01 real work execution (added to Golden Spine)
      const { createUniversalExpression } = await import(
        "@repo/atomic-composition-capability/intent-understanding"
      );

      // Combine form data into single raw content for universal expression pipeline
      const combinedContent = `Title: ${formData.title}\nObjective: ${
        formData.objective || ""
      }\nDescription: ${formData.description || ""}`;

      // Create UniversalIntentInput using human origin (canonical for human intake)
      // Follows EXACT same pattern as external webhooks (ILC/WhatsApp/email) to unify all reality sources
      const universalInput: any = {
        origin: "human",
        actorId: session.actorId,
        raw: {
          type: "work_request",
          content: combinedContent,
        },
        context: {
          source: "human_intake",
          intake_path: "/work/new",
          linkedIntentId: intentId ? intentId : undefined,
        },
      };

      // Execute the FULL universal expression lifecycle pipeline (EOS UNIVERSAL ENTRY)
      // This is the single canonical path for ALL reality sources:
      // Human/External System/Event/Operator/Agent → createUniversalExpression → Understanding → Work
      const universalExpression = await createUniversalExpression(
        universalInput,
        session.tenantId,
        session.workspaceId,
        session.actorId,
      );

      console.log(
        `[SERVER] Universal expression created: ${universalExpression.id}, status: ${universalExpression.status}`,
      );

      // If work was automatically formed by the pipeline (understanding sufficient and canFormWork=true)
      if (universalExpression.workId) {
        console.log(
          `[SERVER] Work automatically created from universal expression: ${universalExpression.workId}`,
        );
        redirect(`/work/${universalExpression.workId}`);
      }
      // Fallback: if pipeline didn't form work (insufficient understanding or info request), use direct creation
      else {
        console.log(
          "[SERVER] Work not automatically formed, falling back to direct creation",
        );
        const { createWorkCommand } = await import("../../../../../../capabilities/work-core/implementation/commands/work.commands");
        const createWorkInput = {
          title: formData.title,
          description: formData.description || "",
          linkedIntentId: intentId ? intentId : undefined,
          domainType: "generic" as const,
          workMode: "project" as const, // Added missing workMode
          sessionId: sessionCookie.value,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        };
        const result = await createWorkCommand.execute(createWorkInput);
        redirect(`/work/${result.workId}`);
      }
    } catch (error) {
      console.error("Error creating work:", error);
      throw new Error(
        "Work could not be created. Your input has not been lost. Please try again.",
      );
    }
  };

  // P2: Breadcrumb navigation items untuk /work/new (UX-SHELL-002) - konsisten dengan semua route lain
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/my-reality" },
    { label: "My Work", href: "/work" },
    {
      label: intent ? "Mulai Pekerjaan dari Kebutuhan" : "Buat Pekerjaan Baru",
      current: true,
    },
  ];
  const userCapabilities = session.userCapabilities || [];

  // Pass all server-resolved data to client boundary component
  return (
    <GlobalNavigation
      productId="default"
      userCapabilities={userCapabilities}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <NewWorkFormClient
          intent={intent}
          intentId={intentId || null}
          handleWorkCreation={handleWorkCreation}
        />
      </div>
    </GlobalNavigation>
  );
}