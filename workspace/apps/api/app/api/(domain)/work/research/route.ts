import { NextResponse } from "next/server";
import { readWorkspaceSessionFromRequest } from '@repo/core-kernel/src/session/workspace-session.js';
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  if (!session?.workspaceId) {
    return NextResponse.json({ 
      error: 'Unauthorized: Invalid or missing workspace session',
      status: 'AUTH_INCONSISTENCY_RESOLVED'
    }, { status: 401 });
  }
  const { workspaceId, tenantId, actorId } = session;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "academic";
    const searchQuery = searchParams.get("searchQuery") ?? "";
    const filterStatus = searchParams.get("filterStatus") ?? "all";

    const result = await capabilityRegistry.invoke("requirement", "getAll", {
      productId,
      searchQuery,
      filterStatus,
    }) as { output?: unknown[] };

    return NextResponse.json(
      {
        items: result.output ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/research] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch research";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}