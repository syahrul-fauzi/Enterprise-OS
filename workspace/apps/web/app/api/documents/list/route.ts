import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

/**
 * API Route: List documents for a workspace
 * Server-side only - isolates database operations from client bundle
 * Complies with Next.js server component boundary requirements
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized: No session found" }, { status: 401 });
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session?.tenantId || !session?.workspaceId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { limit = 50, offset = 0, tenantId, workspaceId } = body;

    // Validate session matches requested workspace
    if (tenantId !== session.tenantId || workspaceId !== session.workspaceId) {
      return NextResponse.json({ error: "Forbidden: Workspace mismatch" }, { status: 403 });
    }

    // Execute document search via capability registry (server-side only)
    // @ts-ignore - Use standard capability registry invocation pattern
    const result = await capabilityRegistry.invokeAsync("documents", "document.list", { 
      limit, 
      offset, 
      tenantId, 
      workspaceId 
    });
    return NextResponse.json(result.output);
  } catch (error) {
    console.error("[API /documents/list] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}