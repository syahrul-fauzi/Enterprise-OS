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
// Mengikuti EXACT pattern yang sama dengan PROD-001.5 (product-delivery) dan LH-004 (legal-case) untuk Rule of Three compliance
const CloseComplianceCaseSchema = z.object({
  sessionId: z.string(),
  reason: z.string().optional(),
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
    const validated = CloseComplianceCaseSchema.parse(body);

    // 3. Invoke capability (canonical pattern - panggil capability registry, tidak langsung panggil fungsi)
    const result = await capabilityRegistry.invoke(
      "investment-compliance",
      "compliance-case.close",
      {
        id: params.id,
        sessionId: validated.sessionId,
        reason: validated.reason,
        workId: params.id // ILC-004: Work ID sama dengan case ID untuk simplifikasi continuity (sesuai core Work primitive pattern)
      }
    );

    // 4. Return server-derived projection (FACE is projection, not owner - sesuai user mandate)
    return NextResponse.json({
      success: true,
      data: result.output,
      graphMetadata: result.output?.graphMetadata || null
    });
  } catch (error) {
    console.error("[API/compliance-cases/close] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to close compliance case",
      code: "COMPLIANCE_CASE_CLOSURE_FAILED"
    }, { status: 500 });
  }
}