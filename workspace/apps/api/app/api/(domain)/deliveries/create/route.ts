import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
// Import work-core commands untuk direct invocation (hindari proxy loop)
import { workCoreCommands } from "../../../../../../../capabilities/work-core/implementation/commands/work.commands.js";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    console.log(`[POST /api/deliveries/create] Canonical Delivery Work API (direct invocation, no proxy loop)`);
    
    // Baca body request
    const body = await request.json();
    console.log(`[POST /api/deliveries/create] 🔍 Original body received: tenantId=${body.tenantId}, workspaceId=${body.workspaceId}, actorId=${body.actorId}`);
    
    // Reuse session handling logic yang sama dari canonical Work API
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    if (!sessionCookie) {
      console.log(`[POST /api/deliveries/create] No existing session - creating anonymous session`);
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`;
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }

    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Merge body dengan session context (sama seperti sebelumnya) - pastikan semua mandatory field terpenuhi
    // title dan claim_status adalah mandatory dari works table schema
    const defaultTitle = body.title || `DEL-001 Delivery Work: ${randomUUID().slice(0,8)}`;
    const mergedBody = {
      ...body,
      title: body.title || defaultTitle, // Pastikan mandatory title terisi
      claim_status: body.claim_status || 'unclaimed', // Default claim_status sesuai database
      sessionId: body.sessionId || session.sessionId,
      tenantId: body.tenantId || session.tenantId,
      workspaceId: body.workspaceId || session.workspaceId,
      actorId: body.actorId || session.actorId,
      domainType: "delivery",
      specialization: "product-delivery"
    };

    // Cari work.create command dari workCoreCommands yang sudah diimport
    const createWorkCommand = workCoreCommands.find(cmd => cmd.name === "create");
    if (!createWorkCommand) {
      throw new Error("work.create command not found in workCoreCommands");
    }
    
    // Panggil work.create command LANGSUNG (TIDAK pakai fetch HTTP - hindari infinite loop)
    const workResult = await createWorkCommand.execute(mergedBody);

    // Tambahkan metadata konteks Work untuk canonical Delivery specialization (PROD-001.1 compliance)
    workResult._eos_context = "work";
    workResult._eos_specialization = "product-delivery";
    workResult._eos_slice = "EOS-FACE-PROD001-001";
    workResult._eos_note = "Canonical Work API endpoint - Delivery adalah product-delivery domain specialization of core Work primitive (direct invocation, no proxy)";
    
    return NextResponse.json(workResult, { status: 201 });

  } catch (error) {
    console.error(`[POST /api/deliveries/create] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create delivery work item";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}