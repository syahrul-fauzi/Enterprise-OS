import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel";

const WORKSPACE_SESSION_COOKIE = "eos_workspace_session";

export async function GET(request: Request) {
  try {
    // 1. Get work_id from query parameters
    const { searchParams } = new URL(request.url);
    const work_id = searchParams.get("work_id");
    
    if (!work_id) {
      return NextResponse.json({ error: "Missing work_id parameter" }, { status: 400 });
    }

    // 2. Get session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session - please refresh and try again" }, { status: 401 });
    }

    // 3. Parse session cookie (base64 encoded JSON)
    let parsedSession;
    try {
      const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      parsedSession = JSON.parse(decodedSession);
    } catch (e) {
      return NextResponse.json({ error: "Invalid session format" }, { status: 400 });
    }

    const { sessionId, tenantId, workspaceId, actorId } = parsedSession;
    if (!sessionId || !tenantId || !workspaceId || !actorId) {
      return NextResponse.json({ error: "Incomplete session data" }, { status: 400 });
    }

    // 4. Invoke communication.listEvents query
    console.log(`[GET /api/communication/list] Listing communications for work ${work_id}`);
    
    const result = await capabilityRegistry.invoke("communication", "communication.listEvents", {
      work_id,
      sessionId: sessionId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      actorId: actorId
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: result.output
    });

  } catch (error) {
    console.error("[GET /api/communication/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}