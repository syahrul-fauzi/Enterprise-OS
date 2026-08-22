import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import {
  createCase,
  listCasesByWorkspace,
} from "../../../../../../capabilities/legal-case/implementation/commands/case.commands";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "../../../../../../capabilities/identity/implementation/repositories/index";

const CreateCaseRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  sourceDiscussionId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get("Cookie");
    console.log(`[POST /api/cases/create] Cookie header received: ${cookie ? cookie.substring(0, 200) + "..." : "MISSING"}`);
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      console.log(`[POST /api/cases/create] ERROR: ${WORKSPACE_SESSION_COOKIE} cookie not found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    console.log(`[POST /api/cases/create] Decoded session: ${JSON.stringify(session)}`);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // REALITY PATH ONLY: init schema + validate session from trusted repository (fail-closed)
    await initIdentitySchema();
    const sessionRepository = getSessionRepositoryPostgres();
    const dbSession = await sessionRepository.byId(session.sessionId as any);
    if (!dbSession || dbSession.revokedAt !== null) {
      console.error(`[POST /api/cases/create] Session revoked/invalid in DB: ${session.sessionId}`);
      return NextResponse.json({ error: "Session revoked or invalid - please re-login" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = CreateCaseRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }
    const { title, description, priority, sourceDiscussionId } = parsed.data;

    // DIRECT command execution - bypass capabilityRegistry (which has 0 loaded commands in production)
    const output = await createCase.execute({
      title,
      description,
      priority,
      sourceDiscussionId,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    });

    console.log(`[POST /api/cases/create] Case created: id=${output?.id} status=${output?.status} workId=${(output as any)?.workId}`);
    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cases/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create case";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionCookie.split("=")[1]);
    if (!session || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await initIdentitySchema();
    const sessionRepository = getSessionRepositoryPostgres();
    const dbSession = await sessionRepository.byId(session.sessionId as any);
    if (!dbSession || dbSession.revokedAt !== null) {
      return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
    const status = (searchParams.get("status") || undefined) as any;

    const result = await listCasesByWorkspace.execute({
      sessionId: session.sessionId,
      limit,
      offset,
      status,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[GET /api/cases/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to list cases";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}