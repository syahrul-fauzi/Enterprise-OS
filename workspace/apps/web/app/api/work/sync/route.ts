/**
 * API Endpoint for work.sync capability
 * Menyediakan HTTP entrypoint untuk menyinkronkan Work ke edge-runtime
 * AUDIT-005 compliant: hanya memanggil capability yang sudah ada di work-core
 */
import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workId, sourceActorId, targetActorId, tenantId, sessionId, executionId } = body;

    // Validasi input sederhana
    if (!workId || !sourceActorId || !tenantId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: workId, sourceActorId, tenantId, sessionId"
      }, { status: 400 });
    }

    // Panggil capability sync dari work-core - tidak membuat logic baru
    const syncResult = await capabilityRegistry.invoke(
      "work-core",
      "sync",
      {
        workId,
        sourceActorId,
        targetActorId: targetActorId || "edge-runtime",
        tenantId,
        sessionId,
        executionId: executionId || `edge-execution-${Date.now()}`,
        statePath: `./.eos-state/execution/edge-work-${workId}.json`,
        metadata: body.metadata || {}
      }
    );

    // Kembalikan hasil ke client
    return NextResponse.json({
      success: (syncResult as any).success,
      workId,
      syncedAt: (syncResult as any).syncedAt,
      contextLossRate: (syncResult as any).contextLossRate,
      message: "Work successfully synced to edge runtime"
    });
  } catch (error) {
    console.error("[API /work/sync] Error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}