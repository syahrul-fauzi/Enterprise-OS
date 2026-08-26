import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel";

const WORKSPACE_SESSION_COOKIE = "eos_workspace_session";

export async function POST(request: Request) {
  try {
    // 1. Get session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session - please refresh and try again" }, { status: 401 });
    }

    // 2. Parse session cookie (base64 encoded JSON)
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

    // 3. Parse request body
    const body = await request.json();
    const { work_id, content, recipient_ids = [] } = body;

    if (!work_id || !content) {
      return NextResponse.json({ error: "Missing required fields: work_id and content are required" }, { status: 400 });
    }

    // 4. Invoke communication.send command
    console.log(`[POST /api/communication/send] Sending message on work ${work_id} from actor ${actorId}`);
    
    const result = await capabilityRegistry.invoke("communication", "communication.send", {
      work_id,
      actor_id: actorId,
      recipient_ids: recipient_ids.length > 0 ? recipient_ids : [actorId], // Default to self if no recipients
      adapter_type: "in_app_chat", // Use in-app chat for web interface
      content,
      session_id: sessionId,
      tenant_id: tenantId,
      workspace_id: workspaceId
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: "Communication sent successfully",
      data: result.output
    });

  } catch (error) {
    console.error("[POST /api/communication/send] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}