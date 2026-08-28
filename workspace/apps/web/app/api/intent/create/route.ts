import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
import { IntentId, type IntentCategory } from "../../../../../../capabilities/identity/implementation/contracts/index";

const GLOBAL_INTENT_STORE_KEY = Symbol.for('eos.face.intent.store.v1');
function getGlobalIntentStore(): Map<string, IntentContract> {
  const g = globalThis as unknown as { [GLOBAL_INTENT_STORE_KEY]?: Map<string, IntentContract> };
  if (!g[GLOBAL_INTENT_STORE_KEY]) {
    g[GLOBAL_INTENT_STORE_KEY] = new Map<string, IntentContract>();
  }
  return g[GLOBAL_INTENT_STORE_KEY];
}
const intentStore = getGlobalIntentStore();

export async function POST(request: Request) {
  try {
    const intent: IntentContract = await request.json();
    
    if (!intent.id || !intent.expression || !intent.resolution) {
      return NextResponse.json(
        { error: "Invalid IntentContract: missing required fields" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    let createdNewAnonymousSession = false;
    
    if (!sessionCookie?.value) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
      createdNewAnonymousSession = true;
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session?.tenantId || !session?.workspaceId || !session.actorId) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
      // Use anonymous session if decoding failed - session is never null after this
      const safeSession = anonymousSession;
      Object.assign(safeSession, session || {});
      // Use safeSession for all subsequent operations
      (globalThis as any).__TEMP_SESSION = safeSession;
      createdNewAnonymousSession = true;
    }
    // Ensure session is never null - use fallback if needed
    const safeSession = (globalThis as any).__TEMP_SESSION || session || createAnonymousWorkspaceSession();

    // Production path: persist to PostgreSQL
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
      const intentRepository = getIntentRepositoryPostgres();
      
      // Convert IntentContract to IntentAggregate for persistence
      const intentAggregate = {
        id: IntentId(intent.id),
        tenantId: safeSession.tenantId,
        workspaceId: safeSession.workspaceId,
        actorId: safeSession.actorId,
        title: intent.expression.substring(0, 100), // Use first 100 chars as title
        description: intent.resolution.objective,
        category: "LEGAL_SERVICE" as IntentCategory, // Default to legal service, can be extended
        status: "RESOLVED" as const,
        metadata: {
          expression: intent.expression,
          source: intent.source,
          context: intent.context,
          resolution: intent.resolution,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      await intentRepository.save(intentAggregate);
      console.log("[API/INTENT/CREATE] ✅ Intent saved to PostgreSQL:", intent.id, intent.expression);
    } else {
      // Development path: in-memory storage
      intentStore.set(intent.id, intent);
      console.log("[API/INTENT/CREATE] ✅ Intent saved (in-memory):", intent.id, intent.expression);
    }

    const response = NextResponse.json({ 
      success: true, 
      intentId: intent.id,
      expression: intent.expression,
      message: "Intent created successfully" 
    }, { status: 201 });

    if (createdNewAnonymousSession) {
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
    console.error("[API/INTENT/CREATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to create intent" },
      { status: 500 }
    );
  }
}

// Export the store for use in get route (in-memory only)
export { intentStore };