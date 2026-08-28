import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";

// CANONICAL API PROXY: /api/service-requests/[id] memforward ke /api/work/[id]
// Menyelesaikan context break: ServiceRequest = Work specialization untuk domain services.id
// Satu Work primitive inti, dengan spesialisasi domain di atasnya
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    console.log(`[GET /api/service-requests/${id}] Canonical ServiceRequest Work API proxying to /api/work/${id}`);
    
    // Reuse EXACTLY the same session handling logic dari canonical Work API
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    if (!sessionCookie) {
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

    // Forward request ke canonical Work API /api/work/[id]
    const legacyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/work/${id}`, {
      method: 'GET',
      headers: {
        'Cookie': `${WORKSPACE_SESSION_COOKIE}=${sessionValue}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await legacyResponse.json();
    // Tambahkan metadata konteks Work untuk canonical ServiceRequest specialization
    data._eos_context = "work";
    data._eos_specialization = "service-request";
    data._eos_slice = "EOS-FACE-SERVICESID-001";
    data._eos_note = "Canonical Work API endpoint - ServiceRequest adalah services.id domain specialization of core Work primitive";
    return NextResponse.json(data, { status: legacyResponse.status });

  } catch (error) {
    console.error(`[GET /api/service-requests/${id}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch service request work item";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}