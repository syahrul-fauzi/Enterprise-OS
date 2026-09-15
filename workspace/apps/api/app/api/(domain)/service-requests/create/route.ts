import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";

// CANONICAL API PROXY: /api/service-requests/create memforward ke /api/work/create
// Menyelesaikan context break: ServiceRequest = Work specialization untuk domain services.id
// Satu Work primitive inti, dengan spesialisasi domain di atasnya
export async function POST(request: Request) {
  try {
    console.log(`[POST /api/service-requests/create] Canonical ServiceRequest Work API proxying to /api/work/create`);
    
    // BACA BODY TERLEBIH DAHULU! (Next.js request.body hanya bisa dibaca sekali)
    const body = await request.json();
    // Debug log TERAWAL untuk memastikan tercetak meskipun ada error di session handling
    console.log(`[POST /api/service-requests/create] 🔍 Original body received: tenantId=${body.tenantId}, workspaceId=${body.workspaceId}, actorId=${body.actorId}`);
    
    // Reuse EXACTLY the same session handling logic dari canonical Work API
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    if (!sessionCookie) {
      console.log(`[POST /api/service-requests/create] No existing session - creating anonymous session`);
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

    // Forward body request ke canonical Work API /api/work/create dengan session context yang lengkap
    // Merge body user dengan session context dari decoded session (hanya jika tidak ada di body)
    // Ini memungkinkan external actor mengirim session context yang valid untuk testing REAL-002-E
    const mergedBody = {
      ...body,
      sessionId: body.sessionId || session.sessionId,
      tenantId: body.tenantId || session.tenantId,
      workspaceId: body.workspaceId || session.workspaceId,
      actorId: body.actorId || session.actorId
    };
    // Debug log untuk verifikasi mergedBody sebelum proxy
    console.log(`[POST /api/service-requests/create] 🔍 mergedBody parameters: tenantId=${mergedBody.tenantId}, workspaceId=${mergedBody.workspaceId}, actorId=${mergedBody.actorId}`);
    const legacyResponse = await fetch(`http://localhost:3001/api/work/create`, {
      method: 'POST',
      headers: {
        'Cookie': `${WORKSPACE_SESSION_COOKIE}=${sessionValue}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mergedBody)
    });

    const data = await legacyResponse.json();
    // Tambahkan metadata konteks Work untuk canonical ServiceRequest specialization
    data._eos_context = "work";
    data._eos_specialization = "service-request";
    data._eos_slice = "EOS-FACE-SERVICESID-001";
    data._eos_note = "Canonical Work API endpoint - ServiceRequest adalah services.id domain specialization of core Work primitive";
    return NextResponse.json(data, { status: legacyResponse.status });

  } catch (error) {
    console.error(`[POST /api/service-requests/create] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create service request work item";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}