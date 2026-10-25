import { NextResponse } from "next/server";
import { readWorkspaceSessionFromRequest } from "@repo/core-kernel";

// Lazy load capability registry to avoid module cycles and support EdgeRuntime
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return capabilityRegistry;
}

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  segment: { params: Promise<{ id: string }> },
) {
  try {
    const params = await segment.params;
    const profileId = params.id;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "academic";
    const includeRequirements = searchParams.get("includeRequirements") !== "0";

    // Use canonical session reader (P1 Reorganize: fix AUTH_INCONSISTENCY)
    const session = readWorkspaceSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing workspace session" }, { status: 401 });
    }

    // Validate session has required context
    if (!session.tenantId || !session.workspaceId || !session.actorId) {
      return NextResponse.json({ error: "Invalid session: missing required context" }, { status: 401 });
    }

    // Lazy load capability registry and verify it's available
    const capabilityRegistry = await getCapabilityRegistry();
    if (!capabilityRegistry?.invoke) {
      return NextResponse.json({ error: "Capability registry unavailable" }, { status: 503 });
    }

    // Invoke canonical identity capability with actorContext (pure adapter pattern)
    const memberResult = await capabilityRegistry.invoke("identity", "getMemberById", {
      memberId: profileId,
      actorContext: session,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    }) as { output?: unknown };

    let authoredRequirements: unknown[] = [];
    if (includeRequirements) {
      const reqResult = await capabilityRegistry.invoke("requirement", "getByAuthor", {
        authorId: profileId,
        productId,
        actorContext: session,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId
      }) as { output?: unknown[] };
      authoredRequirements = reqResult.output ?? [];
    }

    console.log(`[PROFILE FETCH SUCCESS] Profile ${profileId} retrieved via canonical capability for workspace ${session.workspaceId}`);
    return NextResponse.json(
      {
        profile: memberResult.output ?? null,
        authoredRequirements,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/profile/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}