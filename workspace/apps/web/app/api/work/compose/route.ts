/**
 * API Endpoint for atomic-composition.composeTeamFromRequirements capability
 * Menyediakan HTTP entrypoint untuk memulai atomic composition of Work requirements
 * AUDIT-005 compliant: hanya memanggil capability yang sudah ada di atomic-composition
 * Reuse pattern dari /api/work/sync dan /api/work/add-participant yang sudah teruji
 */
import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import type { CapabilityResolutionRequest } from "../../../../../../capabilities/atomic-composition/implementation/contracts/atomic-composition.contracts";

export async function POST(request: Request) {
  try {
    const body = await request.json() as CapabilityResolutionRequest;
    
    // Validasi input minimal sesuai kontrak atomic-composition
    const { workId, requirements, availableActors, availableCapabilities, workspaceId, tenantId, actorId } = body;
    if (!workId || !requirements || !availableActors) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: workId, requirements, availableActors are mandatory"
      }, { status: 400 });
    }

    // Panggil capability composeTeamFromRequirements dari atomic-composition yang sudah ada
    // Tidak membuat logic baru - 100% reuse primitive yang sudah teruji di DEL-001
    const compositionResult = await capabilityRegistry.invoke(
      "atomic-composition",
      "composeTeamFromRequirements",
      body
    ) as { 
      success: boolean; 
      teamId: string; 
      compositionId: string;
      executionTimeMs?: number;
    };

    // Kembalikan hasil ke client dengan metrics yang sudah diinstrumentasi
    return NextResponse.json({
      success: compositionResult.success,
      workId,
      teamId: compositionResult.teamId,
      compositionId: compositionResult.compositionId,
      composedAt: new Date().toISOString(),
      message: "Work composition completed successfully via atomic-composition engine"
    });
  } catch (error) {
    console.error("[API /work/compose] Error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}