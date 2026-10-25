import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import { newCommunicationEventId } from "@repo/capabilities-communication/repository/index.js";


export async function PUT(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const workId = pathname.split('/').pop();
    if (!workId) {
      return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
    }
    console.log(`[API/WORK/PUT] 📥 Recipient response received for work ${workId}`);
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    
    // Validate minimal required body (only response and optional reason - actor resolved from session)
    if (!body.response || !["accept", "reject"].includes(body.response)) {
      return NextResponse.json({ error: "Valid response (accept/reject) is required" }, { status: 400 });
    }
    
    // 1. Parse session from cookie menggunakan canonical decodeWorkspaceSession (AUDIT-003 compliance)
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
        // Gunakan decodeWorkspaceSession canonical, tidak perlu parse base64 manual
        const existingSession = decodeWorkspaceSession(sessionValue);
        // Add null check and type validation to fix remaining type error (sessionId possibly undefined)
        if (existingSession && typeof existingSession.sessionId === 'string' && existingSession.sessionId.length > 0) {
          parsedSession = {
            sessionId: existingSession.sessionId,
            tenantId: existingSession.tenantId ?? parsedSession.tenantId,
            workspaceId: existingSession.workspaceId ?? parsedSession.workspaceId,
            actorId: existingSession.actorId ?? parsedSession.actorId
          };
        }
      } catch (e) { console.error("[API/WORK/PUT] Session parse error:", e); }
    }
    
    // Reject unauthenticated requests (AUTH-003 compliance: no anonymous fallback)
    if (!parsedSession.sessionId || !parsedSession.tenantId || !parsedSession.workspaceId || !parsedSession.actorId) {
      console.error(`[API/WORK/PUT] ❌ Unauthorized: No valid session for response attempt`);
      return NextResponse.json({ error: "Invalid or incomplete session" }, { status: 401 });
    }
    
    // Resolve actor from parsed session
    const responderActorId = parsedSession.actorId;
    
    // PURE ADAPTER PATTERN: Invoke canonical work-core/getWork (tidak import dari route lain)
    let canonicalWork;
    try {
      canonicalWork = await capabilityRegistry.invoke(
        "work-core",
        "getWork",
        {
          workId: workId,
          actorId: responderActorId,
          sessionId: parsedSession.sessionId,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (workError: any) {
      if (workError.message.includes("work_not_found")) {
        console.error(`[API/WORK/PUT] ❌ Work not found: ${workId}`);
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
      }
      if (workError.message.includes("permission_denied")) {
        console.error(`[API/WORK/PUT] ❌ Unauthorized: actor ${responderActorId} is not a participant of work ${workId}`);
        return NextResponse.json({ error: "Unauthorized: You do not have access to this work" }, { status: 403 });
      }
      throw workError;
    }
    
    console.log(`[API/WORK/PUT] ✅ Authorization verified via canonical work-core/getWork: actor ${responderActorId} authorized for work ${workId}`);
    
    // PURE ADAPTER PATTERN: Invoke canonical communication/send (tidak simpan di globalThis)
    const eventId = newCommunicationEventId();
    try {
      await capabilityRegistry.invoke(
        "communication",
        "send",
        {
          id: eventId,
          workId: workId,
          actorId: responderActorId,
          event_type: "InboundMessage",
          channel: "api_webhook",
          status: "received",
          payload: {
            response: body.response,
            reason: body.reason || "No reason provided"
          },
          createdAt: new Date().toISOString(),
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (commError) {
      console.error("[API/WORK/PUT] Communication capability failed:", commError);
      return NextResponse.json({ error: "Failed to save communication event" }, { status: 500 });
    }
    
    console.log(`[API/WORK/PUT] ✅ Response saved successfully via canonical communication/send for work ${workId}, event: ${eventId}`);
    return NextResponse.json({
      success: true,
      eventId: eventId,
      workId: workId,
      actorId: responderActorId,
      response: body.response,
      _eos_source: "canonical-capability-registry"
    }, { status: 200 });
  } catch (error) {
    console.error("[API/WORK/PUT] FULL ERROR DETAIL:", error);
    if (error instanceof Error) {
      console.error("[API/WORK/PUT] Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to process recipient response", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const workId = pathname.split('/').pop();
    
    if (!workId) {
      return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
    }

    // 1. Parse session from cookie menggunakan canonical decodeWorkspaceSession (AUTH-003 compliance)
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
        const existingSession = decodeWorkspaceSession(sessionValue);
        if (existingSession && typeof existingSession.sessionId === 'string' && existingSession.sessionId.length > 0) {
          parsedSession = {
            sessionId: existingSession.sessionId,
            tenantId: existingSession.tenantId ?? parsedSession.tenantId,
            workspaceId: existingSession.workspaceId ?? parsedSession.workspaceId,
            actorId: existingSession.actorId ?? parsedSession.actorId
          };
        }
      } catch (e) { console.error("[API/WORK/GET] Session parse error:", e); }
    }
    
    // Reject unauthenticated requests (AUTH-003 compliance: no anonymous fallback)
    if (!parsedSession.sessionId || !parsedSession.tenantId || !parsedSession.workspaceId || !parsedSession.actorId) {
      console.error(`[API/WORK/GET] ❌ Unauthorized: No valid session for work access attempt`);
      return NextResponse.json({ error: "Invalid or incomplete session" }, { status: 401 });
    }
    const requesterActorId = parsedSession.actorId;

    // PURE ADAPTER PATTERN: Invoke canonical work-core/getWork (tidak pakai globalThis work store)
    let canonicalWork;
    try {
      canonicalWork = await capabilityRegistry.invoke(
        "work-core",
        "getWork",
        {
          workId: workId,
          actorId: requesterActorId,
          sessionId: parsedSession.sessionId,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (workError: any) {
      if (workError.message.includes("work_not_found")) {
        console.error(`[API/WORK/GET] ❌ Work not found: ${workId}`);
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
      }
      if (workError.message.includes("permission_denied")) {
        console.error(`[API/WORK/GET] ❌ Unauthorized: actor ${requesterActorId} is not a participant of work ${workId}`);
        return NextResponse.json({ error: "Unauthorized: You do not have access to this work" }, { status: 403 });
      }
      throw workError;
    }
    
    console.log(`[API/WORK/GET] ✅ Authorization verified via canonical work-core/getWork: actor ${requesterActorId} authorized for work ${workId}`);
    
    // PURE ADAPTER PATTERN: Invoke canonical work-core/evidence.getByWorkId untuk mengambil evidence
    let evidence;
    try {
      evidence = await capabilityRegistry.invoke(
        "work-core",
        "evidence.getByWorkId",
        {
          workId: workId,
          actorId: requesterActorId,
          sessionId: parsedSession.sessionId,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (evidenceError) {
      console.log("[API/WORK/GET] Evidence fetch failed (continuing with work data only):", evidenceError);
      evidence = [];
    }

    // Create a helper to set session cookie if needed (Hapus logika anonymous createNewSession - AUTH-003: tidak ada anonymous fallback)
    const createResponse = (data: any, status: number = 200) => {
      const response = NextResponse.json(data, { status });
      return response;
    };

    const responsePayload = {
      ...canonicalWork,
      id: canonicalWork.workId,
      workId: canonicalWork.workId,
      title: canonicalWork.title,
      description: canonicalWork.description,
      status: canonicalWork.status,
      linkedIntentId: canonicalWork.linkedIntentId,
      specialization: canonicalWork.specialization,
      tenant_id: canonicalWork.tenantId,
      workspace_id: canonicalWork.workspaceId,
      createdAt: canonicalWork.createdAt,
      updatedAt: canonicalWork.updatedAt,
      evidence: evidence || canonicalWork.evidence,
      lawyerId: canonicalWork.lawyerId,
      customerId: canonicalWork.actorId,
      _eos_source: "canonical-work-store",
    };

    console.log(`[API/WORK/GET] ✅ Serving from canonical store: ${workId} (linkedIntent: ${canonicalWork.linkedIntentId}, specialization: ${canonicalWork.specialization})`);
    
    // PURE ADAPTER: Fetch communications via canonical capabilityRegistry (tidak pakai variabel undefined)
    let communications;
    try {
      communications = await capabilityRegistry.invoke(
        "communication",
        "getByWorkId",
        {
          workId: workId,
          actorId: requesterActorId,
          sessionId: parsedSession.sessionId,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (commError) {
      console.log("[API/WORK/GET] Communications fetch failed (continuing with empty list):", commError);
      communications = [];
    }
    responsePayload.communications = communications;

    return createResponse(responsePayload, 200);
  } catch (error) {
    console.error("[API/WORK/GET] FULL ERROR DETAIL:", error);
    if (error instanceof Error) {
      console.error("[API/WORK/GET] Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to retrieve work through canonical API proxy", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const workId = pathname.split('/').pop();
    
    if (!workId) {
      return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
    }
    
    // Parse body terlebih dahulu
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // 1. Parse session menggunakan canonical decodeWorkspaceSession
    const cookie = request.headers.get("Cookie");
    let parsedSession;
    try {
      const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
      if (!sessionCookie) throw new Error("Session cookie not found");
      const sessionValue = sessionCookie.split('=')[1];
      if (!sessionValue) throw new Error("Empty session value");
      const decodedSession = decodeWorkspaceSession(sessionValue);
      if (decodedSession?.sessionId) {
        parsedSession = {
          sessionId: decodedSession.sessionId,
          tenantId: decodedSession.tenantId,
          workspaceId: decodedSession.workspaceId,
          actorId: decodedSession.actorId
        };
        console.log(`[API/WORK/POST] ✅ Canonical session parsed successfully: actorId=${parsedSession.actorId}`);
      } else {
        throw new Error("Invalid session from decodeWorkspaceSession");
      }
    } catch (e) {
      console.error("[API/WORK/POST] ❌ Session parse failed:", e);
      return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
    }

    // PURE ADAPTER PATTERN: DAPATKAN WORK DAHULU (VERIFIKASI AUTHORISASI)
    let canonicalWork;
    try {
      canonicalWork = await capabilityRegistry.invoke(
        "work-core",
        "getWork",
        {
          workId: workId,
          actorId: parsedSession.actorId,
          sessionId: parsedSession.sessionId,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (workError: any) {
      if (workError.message.includes("work_not_found")) {
        console.error(`[API/WORK/POST] ❌ Work not found: ${workId}`);
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
      }
      if (workError.message.includes("permission_denied")) {
        console.error(`[API/WORK/POST] ❌ Unauthorized: actor ${parsedSession.actorId} is not a participant of work ${workId}`);
        return NextResponse.json({ error: "Unauthorized: You do not have access to this work" }, { status: 403 });
      }
      throw workError;
    }

    // PURE ADAPTER PATTERN: UPDATE WORK MENGGUNAKAN KANONIS work-core/update
    let updatedWork;
    try {
      updatedWork = await capabilityRegistry.invoke(
        "work-core",
        "updateWork",
        {
          workId: workId,
          actorId: parsedSession.actorId,
          sessionId: parsedSession.sessionId,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId,
          updates: body // Semua update diteruskan ke canonical handler (command, status, providerId, dll.)
        }
      );
    } catch (updateError: any) {
      console.error(`[API/WORK/POST] ❌ Work update failed:`, updateError);
      return NextResponse.json({ error: "Failed to update work", details: updateError.message }, { status: 500 });
    }

    // Simpan evidence transition jika ada command/status change
    try {
      await capabilityRegistry.invoke(
        "work-core",
        "addEvidence",
        {
          workId: workId,
          actorId: parsedSession.actorId,
          type: "transition",
          title: `Work updated via API: ${body.command || body.status || "general update"}`,
          content: body.note || `Work updated by ${parsedSession.actorId}`,
          tenantId: parsedSession.tenantId,
          workspaceId: parsedSession.workspaceId
        }
      );
    } catch (evidenceError) {
      console.log("[API/WORK/POST] Evidence save failed (continuing):", evidenceError);
    }

    console.log(`[API/WORK/POST] ✅ Work updated successfully via canonical work-core/update: ${workId}`);
    return NextResponse.json({
      success: true,
      work: updatedWork,
      _eos_source: "canonical-capability-registry"
    }, { status: 200 });
  } catch (error) {
    console.error("[API/WORK/POST] FULL ERROR DETAIL:", error);
    if (error instanceof Error) {
      console.error("[API/WORK/POST] Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to process work update", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}