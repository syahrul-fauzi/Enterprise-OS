import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel/session/workspace-session";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Proxy ke canonical Work API endpoint untuk mendapatkan detail Work yang mendasari delivery
    const legacyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/work/${params.id}`, {
      method: 'GET',
      headers: {
        'Cookie': `${WORKSPACE_SESSION_COOKIE}=${sessionCookie.value}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await legacyResponse.json();
    // Tambahkan metadata konteks Work untuk canonical Delivery specialization (PROD-001.1)
    data._eos_context = "work";
    data._eos_specialization = "product-delivery";
    data._eos_slice = "EOS-FACE-PROD001-002";
    data._eos_note = "Canonical Work API endpoint - Delivery detail view untuk product-delivery domain";
    return NextResponse.json(data, { status: legacyResponse.status });

  } catch (error) {
    const { id } = await params;
    console.error(`[GET /api/deliveries/${id}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch delivery details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}