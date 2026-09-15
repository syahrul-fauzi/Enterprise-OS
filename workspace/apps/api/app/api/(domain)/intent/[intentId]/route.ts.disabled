import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { intentStore } from "../create/route";
import type { IntentContract } from "@repo/presentation-features";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import {
  getIntentRepositoryPostgres,
  initIdentitySchema,
} from "../../../../../../capabilities/identity/implementation/repositories/index";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ intentId: string }> }
) {
  try {
    const { intentId } = await params;
    
    const cookieStore = await cookies();
    let sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    let createdNewSession = false;
    
    if (!sessionCookie?.value) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
      createdNewSession = true;
    }

    let session = decodeWorkspaceSession(sessionCookie.value);
    if (!session?.tenantId || !session?.workspaceId) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
      session = anonymousSession;
      createdNewSession = true;
    }

    let intent: IntentContract | undefined;
    
    // Production path: retrieve from PostgreSQL
    if (process.env.DATABASE_URL) {
      try {
        await initIdentitySchema();
        const intentRepository = getIntentRepositoryPostgres();
        const intentAggregate = await intentRepository.byId(intentId, {
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
        });

        if (intentAggregate) {
          intent = {
            id: intentAggregate.id,
            expression: intentAggregate.metadata?.expression || intentAggregate.title,
            source: intentAggregate.metadata?.source || { actorType: "human", entryPoint: "eos-face", timestamp: intentAggregate.createdAt.toISOString() },
            context: intentAggregate.metadata?.context,
            resolution: intentAggregate.metadata?.resolution || {
              objective: intentAggregate.description || "",
              expectedOutcome: "",
              context: intentAggregate.category,
              workType: "",
              confidence: 1.0,
            },
          };
          console.log("[API/INTENT/GET] ✅ Intent retrieved from PostgreSQL:", intentId);
        }
      } catch (pgError) {
        console.warn("[API/INTENT/GET] ⚠️ PostgreSQL lookup failed, falling back to in-memory:", pgError);
      }
    }
    
    // Development fallback: in-memory store (also used if PG lookup returned nothing)
    if (!intent) {
      intent = intentStore.get(intentId) as IntentContract | undefined;
      if (intent) {
        console.log("[API/INTENT/GET] ✅ Intent retrieved (in-memory fallback):", intentId);
      }
    }

    if (!intent) {
      return NextResponse.json(
        { error: "Intent not found" },
        { status: 404 }
      );
    }

    const response = NextResponse.json(intent);
    if (createdNewSession && sessionCookie?.value) {
      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: sessionCookie.value,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("[API/INTENT/GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve intent" },
      { status: 500 }
    );
  }
}