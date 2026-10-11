/**
 * API Endpoint for work.linkExisting capability
 * Menyediakan HTTP entrypoint untuk menghubungkan Work ke domain/product baru (cross-product handoff)
 * AUDIT-005 compliant: hanya memanggil capability yang sudah ada di work-core
 * DIBUAT UNTUK SIG-NEXT-001-W8: lawyershub→ilc cross-product handoff
 */
import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workId, domainType, sessionId, tenantId, workspaceId, actorId, targetProductId, domainSpecificData } = body;

    // Validasi input sesuai linkExistingWorkCommand schema
    if (!workId || !domainType || !sessionId || !tenantId || !workspaceId || !actorId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: workId, domainType, sessionId, tenantId, workspaceId, actorId"
      }, { status: 400 });
    }

    // Panggil capability linkExisting dari work-core - tidak membuat logic baru
    const linkExistingResult = await capabilityRegistry.invoke(
      "work-core",
      "link-existing",
      {
        workId,
        domainType,
        sessionId,
        tenantId,
        workspaceId,
        actorId,
        targetProductId,
        domainSpecificData: domainSpecificData || {},
        executionId: `sig-next-001-w8-link-${Date.now()}`,
        metadata: {
          slice: "SIG-NEXT-001-W8",
          purpose: "cross-product-handoff-lawyershub-to-ilc"
        }
      }
    );

    // Kembalikan hasil ke client
    return NextResponse.json({
      success: true,
      workId,
      linkedToProduct: (linkExistingResult as any).linkedToProduct,
      domainType: (linkExistingResult as any).domainType,
      linkedAt: new Date().toISOString(),
      message: "Work successfully linked to target product/domain"
    });
  } catch (error) {
    console.error("[API /work/link-existing] Error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}