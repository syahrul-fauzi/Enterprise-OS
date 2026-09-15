import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import { CommunicationRepositoryInMemory } from "../../../../../../capabilities/communication/implementation/repository/index";

// P0 FIX: Enable anonymous users to access communications on their work items
// EOS-COMM-002: API endpoint to retrieve ALL communication events bound to a single workId
// This is what powers the Work Reality Surface - showing everything connected to ONE WORK
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workId = searchParams.get("workId");
  
  if (!workId) {
    return NextResponse.json({ error: "workId parameter is required" }, { status: 400 });
  }

  try {
    // Extract session from cookie - P0: support anonymous users
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    let session;
    // Create anonymous session if none exists (same pattern as cases routes)
    if (!sessionCookie) {
      console.log(`[GET /api/communications/by-work-id] No existing session - using anonymous session`);
      session = createAnonymousWorkspaceSession();
    } else {
      // Decode existing authenticated or anonymous session
      const sessionValue = sessionCookie.split("=")[1];
      if (!sessionValue) {
        return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
      }
      session = decodeWorkspaceSession(sessionValue);
      if (!session || !session.tenantId || !session.workspaceId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
    }
    
    // Get tenant and workspace from session (maintains EOS tenant isolation)
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    // Fetch ALL events for this workId - EOS core invariant: everything stays connected
    const events = await CommunicationRepositoryInMemory.byWorkId(workId, {
      tenantId,
      workspaceId
    });

    return NextResponse.json({
      events,
      workId,
      total: events.length,
      channels: Array.from(new Set(events.map(e => e.adapter_type))),
      _eos_note: "All communication events bound to single workId - EOS keeps work connected"
    });
  } catch (error) {
    console.error("[API/communications/by-work-id] Error:", error);
    return NextResponse.json({ error: "Failed to retrieve communication events" }, { status: 500 });
  }
}