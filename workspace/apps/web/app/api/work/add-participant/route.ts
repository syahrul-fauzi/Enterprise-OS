/**
 * API Endpoint for work.addParticipant capability
 * Menyediakan HTTP entrypoint untuk menambahkan participant ke Work dengan restricted authority
 * AUDIT-005 compliant: hanya memanggil capability yang sudah ada di work-core
 * DIBUAT UNTUK RET-001: inventory manager-only authority activation
 */
import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workId, requesterActorId, actorId, role, tenantId, sessionId } = body;

    // Validasi input sederhana sesuai addParticipantCommand requirements
    if (!workId || !requesterActorId || !actorId || !tenantId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: workId, requesterActorId, actorId, tenantId, sessionId"
      }, { status: 400 });
    }

    // Panggil capability addParticipant dari work-core - tidak membuat logic baru
    const addParticipantResult = await capabilityRegistry.invoke(
      "work-core",
      "addParticipant",
      {
        workId,
        requesterActorId, // Hanya pemilik Work yang bisa menambahkan participant
        actorId,          // Inventory manager yang ditambahkan
        role: role || "inventory-manager", // Role spesifik RET-001 untuk authority check
        tenantId,
        sessionId,
        executionId: `ret-001-participant-${Date.now()}`,
        metadata: body.metadata || {
          slice: "RET-001",
          purpose: "add-inventory-manager-participant-with-restricted-authority"
        }
      }
    );

    // Kembalikan hasil ke client
    return NextResponse.json({
      success: (addParticipantResult as any).success,
      workId,
      participants: (addParticipantResult as any).participants,
      addedAt: new Date().toISOString(),
      message: "Inventory manager successfully added as participant with restricted authority"
    });
  } catch (error) {
    console.error("[API /work/add-participant] Error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}