import { NextResponse } from "next/server";
import { CommunicationRepositoryInMemory } from "../../../../../../capabilities/communication/dist/repository/communication.repository.js";

// EOS-COMM-002: API endpoint to retrieve ALL communication events bound to a single workId
// This is what powers the Work Reality Surface - showing everything connected to ONE WORK
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workId = searchParams.get("workId");
  
  if (!workId) {
    return NextResponse.json({ error: "workId parameter is required" }, { status: 400 });
  }

  try {
    // Get tenant and workspace from session (maintains EOS tenant isolation)
    const tenantId = request.headers.get("x-tenant-id") || "tenant-001";
    const workspaceId = request.headers.get("x-workspace-id") || "workspace-001";

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