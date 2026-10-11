import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { z } from "zod";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity";

// Canonical API proxy pattern (domain specialization of core Work primitive)
// Mengikuti EXACT pattern yang sama dengan Services.ID intake API dan LH-003/LawyersHub
const CompleteDeliverySchema = z.object({
  sessionId: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verifikasi session dan authorization (sesuai tenant isolation) - reuse canonical session handling pattern
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Validate active session for authenticated users
    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    // 2. Parse body sesuai schema
    const body = await request.json();
    const validated = CompleteDeliverySchema.parse(body);

    // 3. Invoke capability (canonical pattern - panggil capability registry, tidak langsung panggil fungsi)
    const result = await capabilityRegistry.invoke(
      "product-delivery",
      "delivery.complete",
      {
        id: params.id,
        sessionId: validated.sessionId,
      }
    );

    // 4. Return server-derived projection (FACE is projection, not owner)
    return NextResponse.json({
      success: true,
      data: result.output,
      graphMetadata: result.output?.graphMetadata || null
    });
  } catch (error) {
    console.error("[API/deliveries/complete] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to complete delivery",
      code: "DELIVERY_COMPLETION_FAILED"
    }, { status: 500 });
  }
}