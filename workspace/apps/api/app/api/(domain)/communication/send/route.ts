import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { readWorkspaceSessionFromRequest } from '@repo/core-kernel/src/session/workspace-session.js';

export async function POST(request: Request) {
  try {
    // Canonical session validation - extract verified workspace/tenant/actor IDs
    const session = readWorkspaceSessionFromRequest(request);
    if (!session?.sessionId || !session?.tenantId || !session?.workspaceId || !session?.actorId) {
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid or missing workspace session',
        status: 'AUTH_INCONSISTENCY_RESOLVED'
      }, { status: 401 });
    }
    const { sessionId, tenantId, workspaceId, actorId } = session;

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