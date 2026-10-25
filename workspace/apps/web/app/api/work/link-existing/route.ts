/**
 * API Endpoint for work.linkExisting capability
 * Menyediakan HTTP entrypoint untuk menghubungkan Work ke domain/product baru (cross-product handoff)
 * AUDIT-005 compliant: hanya memanggil capability yang sudah ada di work-core
 * DIBUAT UNTUK SIG-NEXT-001-W8: lawyershub→ilc cross-product handoff
 */
import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { decodeWorkspaceSession, WORKSPACE_SESSION_COOKIE } from "@repo/core-kernel";
import { getWorkById } from "../create/route";
// Gunakan permission check terverifikasi dari work-core untuk ONE TRUTH source (sesuai tsconfig.json path alias)
import { getWork } from "@repo/capabilities-work-core/implementation/commands/work.commands";

export async function POST(request: Request) {
  try {
    // Parse URL and extract workId from path for consistency with [id]/route.ts
    const { pathname } = new URL(request.url);
    const workId = pathname.split('/').pop();
    if (!workId) {
      return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { domainType, targetProductId, domainSpecificData } = body;

    // Validasi input sesuai linkExistingWorkCommand schema
    if (!domainType || !targetProductId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: domainType, targetProductId"
      }, { status: 400 });
    }

    // 1. Parse session from cookie (never trust from body - security mandate, reuse PUT/POST pattern)
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    let parsedSession = {
      sessionId: "",
      tenantId: "",
      workspaceId: "",
      actorId: ""
    };
    if (sessionCookie) {
      try {
        const sessionValue = sessionCookie.split('=')[1];
        if (!sessionValue) throw new Error("Empty session value");
        const decodedSession = decodeWorkspaceSession(sessionValue);
        if (decodedSession?.sessionId) {
          parsedSession = {
            sessionId: decodedSession.sessionId,
            tenantId: decodedSession.tenantId ?? parsedSession.tenantId,
            workspaceId: decodedSession.workspaceId ?? parsedSession.workspaceId,
            actorId: decodedSession.actorId ?? parsedSession.actorId
          };
        }
      } catch (e) { console.error("[API/WORK/LINK-EXISTING] Session parse error:", e); }
    }

    // Reject unauthenticated requests (AUTH-003 compliance: no anonymous fallback)
    if (!parsedSession.sessionId || !parsedSession.tenantId || !parsedSession.workspaceId || !parsedSession.actorId) {
      console.error(`[API/WORK/LINK-EXISTING] ❌ Unauthorized: No valid session for link attempt`);
      return NextResponse.json({ error: "Invalid or incomplete session" }, { status: 401 });
    }

    // Resolve actor from parsed session
    const actorId = parsedSession.actorId;

    // PRIMARY: Gunakan getWork dari work-core untuk verifikasi akses (ONE TRUTH source)
    // getWork secara internal akan melakukan pengecekan isOwner/isParticipant
    try {
      const workRecord = await getWork({
        workId: workId,
        workspaceId: parsedSession.workspaceId,
        actorId: parsedSession.actorId,
        sessionId: parsedSession.sessionId,
        tenantId: parsedSession.tenantId
      });
      console.log(`[API/WORK/LINK-EXISTING] ✅ Work-core permission check passed: actor ${actorId} authorized for work ${workId}`);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("permission_denied")) {
        console.error(`[API/WORK/LINK-EXISTING] ❌ Unauthorized (work-core): actor ${actorId} is not a participant/owner of work ${workId}`);
        return NextResponse.json({ error: "Unauthorized: You do not have access to this work" }, { status: 403 });
      }
      if (errorMessage.includes("work_not_found")) {
        console.error(`[API/WORK/LINK-EXISTING] ❌ Work not found (work-core): ${workId}`);
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
      }
      // Propagate other unexpected errors
      throw error;
    }

    // Fallback: Cek canonical work store untuk data yang dibutuhkan API response
    const canonicalWork = await getWorkById(workId);
    if (!canonicalWork) {
      console.log(`[API/WORK/LINK-EXISTING] ⚠️ Canonical work cache miss for ${workId}, but work-core verified existence`);
    }

    // Panggil capability linkExisting dari work-core - tidak membuat logic baru
    const linkExistingResult = await capabilityRegistry.invoke(
      "work-core",
      "link-existing",
      {
        workId,
        domainType,
        sessionId: parsedSession.sessionId,
        tenantId: parsedSession.tenantId,
        workspaceId: parsedSession.workspaceId,
        actorId: parsedSession.actorId,
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