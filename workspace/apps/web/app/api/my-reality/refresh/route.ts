import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
// Import canonical model builder from correct path - fixes module resolution error
import { buildMyRealityModel } from "@/app/(eos)/my-reality/getMyRealityModel";

/**
 * Canonical MyReality model refresh API endpoint.
 * 
 * Implements RUNTIME OWNS REALITY: Returns fresh canonical model from server,
 * no client-side state invention. Used by polling fallback to refresh entire model
 * without page reload.
 * 
 * Compliance:
 * - Requires valid workspace session cookie
 * - Rebuilds model from fresh canonical work data
 * - Returns complete MyRealityModel for client to render
 */
export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing session" },
      { status: 401 }
    );
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    return NextResponse.json(
      { error: "Unauthorized: Failed to decode session" },
      { status: 401 }
    );
  }

  if (!session) {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    return NextResponse.json(
      { error: "Unauthorized: Invalid session" },
      { status: 401 }
    );
  }

  try {
    // Rebuild canonical model from fresh server-side data
    const model = await buildMyRealityModel({
      actorId: session.actorId,
      actorLabel: session.actorLabel,
      workspaceId: session.workspaceId,
      tenantId: session.tenantId,
    });

    console.log(`[API/MY-REALITY/REFRESH] ✅ Canonical model refreshed for workspace: ${session.workspaceId}`);
    return NextResponse.json(model, { status: 200 });
  } catch (error) {
    console.error("[API/MY-REALITY/REFRESH] ❌ Failed to refresh canonical model:", error);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to refresh model" },
      { status: 500 }
    );
  }
}