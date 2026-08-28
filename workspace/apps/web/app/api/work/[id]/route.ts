import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getWorkById, type CanonicalWorkRecord } from "../create/route";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";

export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const workId = pathname.split('/').pop();
    
    if (!workId) {
      return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
    }

    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    let createdNewSession = false;
    
    if (!sessionCookie) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`;
      createdNewSession = true;
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);

    // PRIMARY: Check canonical work store first (created via /api/work/create)
    const canonicalWork = getWorkById(workId);
    if (canonicalWork) {
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
        evidence: canonicalWork.evidence,
        lawyerId: canonicalWork.lawyerId,
        customerId: canonicalWork.actorId,
        _eos_source: "canonical-work-store",
      };

      console.log(`[API/WORK/GET] ✅ Serving from canonical store: ${workId} (linkedIntent: ${canonicalWork.linkedIntentId}, specialization: ${canonicalWork.specialization})`);
      
      const response = NextResponse.json(responsePayload, { status: 200 });
      if (createdNewSession && sessionValue) {
        response.cookies.set({
          name: WORKSPACE_SESSION_COOKIE,
          value: sessionValue,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      }
      return response;
    }

    // FALLBACK: Proxy to cases implementation
    const caseResponse = await fetch(new URL(`/api/cases/${workId}`, request.url), {
      method: "GET",
      headers: Object.fromEntries(request.headers),
    });

    const caseData = await caseResponse.json();
    
    if (caseData.case || caseData.id) {
      const transformed = {
        ...caseData,
        work: caseData.case,
        workId: caseData.id || caseData.caseId,
      };
      const response = NextResponse.json(transformed, { status: caseResponse.status });
      if (createdNewSession && sessionValue) {
        response.cookies.set({
          name: WORKSPACE_SESSION_COOKIE,
          value: sessionValue,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      }
      return response;
    }

    const response = NextResponse.json(caseData, { status: caseResponse.status });
    if (createdNewSession && sessionValue) {
      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: sessionValue,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("[API/WORK/GET] Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve work through canonical API proxy" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const workId = pathname.split('/').pop();
    
    if (!workId) {
      return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
    }

    const body = await request.json();
    
    const caseResponse = await fetch(new URL(`/api/cases/${workId}`, request.url), {
      method: "PUT",
      headers: Object.fromEntries(request.headers),
      body: JSON.stringify(body),
    });

    const caseData = await caseResponse.json();
    return NextResponse.json(caseData, { status: caseResponse.status });
  } catch (error) {
    console.error("[API/WORK/PUT] Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to update work through canonical API proxy" },
      { status: 500 }
    );
  }
}