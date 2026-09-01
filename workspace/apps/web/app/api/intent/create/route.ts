import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { IntentContract, IntentContext, IntentResolution } from "@repo/presentation-features";
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

// R4 Universal Entry - Semantic Intent Resolver untuk multiple domain (SERVER-SIDE only)
function resolveSemanticIntent(expression: string): { 
  resolution: IntentResolution; 
  context: IntentContext;
  domainType: string;
} {
  const lowerExpression = expression.toLowerCase();
  
  // Legal domain patterns
  if (lowerExpression.includes("mendirikan pt") || lowerExpression.includes("mendirikan perusahaan") || 
      lowerExpression.includes("legal") || lowerExpression.includes("hukum") || 
      lowerExpression.includes("kasus") || lowerExpression.includes("kontrak")) {
    return {
      resolution: {
        objective: "Mendirikan PT untuk bisnis baru",
        context: "Legal / Company Formation",
        expectedOutcome: "PT berhasil didirikan dengan dokumen legal lengkap",
        workType: "legal-case",
        confidence: 0.95
      },
      context: { domain: "legal", locale: "id-ID" },
      domainType: "legal-case"
    };
  }
  
  // Services domain patterns (Services.ID)
  if (lowerExpression.includes("jasa") || lowerExpression.includes("servis") || 
      lowerExpression.includes("perbaikan") || lowerExpression.includes("maintenance") || 
      lowerExpression.includes("konsultan") || lowerExpression.includes("IT") ||
      lowerExpression.includes("teknologi")) {
    return {
      resolution: {
        objective: "Meminta layanan jasa profesional",
        context: "Services / Professional Service Request",
        expectedOutcome: "Layanan berhasil diadakan dan diselesaikan oleh penyedia jasa",
        workType: "service-request",
        confidence: 0.92
      },
      context: { domain: "services", locale: "id-ID" },
      domainType: "service-request"
    };
  }
  
  // Professional EOS Face: Generic business/growth intent handling (no hardcoded golden proofs)
  if (lowerExpression.includes("meluncurkan bisnis") || lowerExpression.includes("launch business") || 
      lowerExpression.includes("bisnis online") || lowerExpression.includes("start bisnis") ||
      lowerExpression.includes("buka usaha") || lowerExpression.includes("mulai usaha") ||
      lowerExpression.includes("mengembangkan usaha") || lowerExpression.includes("tambah penjualan")) {
    return {
      resolution: {
        objective: "Mengembangkan usaha saya",
        context: "Pengembangan Bisnis / Pertumbuhan Usaha",
        expectedOutcome: "Usaha dapat berkembang dengan bantuan penyedia layanan yang sesuai",
        workType: "business-growth",
        confidence: 0.95
      },
      context: { domain: "business", locale: "id-ID" },
      domainType: "business-growth"
    };
  }
  
  // Academic domain patterns (ILC)
  if (lowerExpression.includes("akademik") || lowerExpression.includes("kuliah") || 
      lowerExpression.includes("penelitian") || lowerExpression.includes("riset") || 
      lowerExpression.includes("skripsi") || lowerExpression.includes("tesis") ||
      lowerExpression.includes("studi")) {
    return {
      resolution: {
        objective: "Melakukan penelitian akademik",
        context: "Academic / Research and Study",
        expectedOutcome: "Penelitian selesai dengan hasil yang dapat dipublikasikan",
        workType: "academic-research",
        confidence: 0.90
      },
      context: { domain: "academic", locale: "id-ID" },
      domainType: "consultation"
    };
  }
  
  // Default fallback - generic work
  return {
    resolution: {
      objective: "Menjalankan pekerjaan umum",
      context: "General / Generic Work",
      expectedOutcome: "Pekerjaan berhasil diselesaikan",
      workType: "generic",
      confidence: 0.7
    },
    context: { domain: "generic", locale: "id-ID" },
    domainType: "generic"
  };
}

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
    const rawIntent = await request.json();
    
    // Client only sends raw expression and source - server handles ALL semantic interpretation
    if (!rawIntent.expression || !rawIntent.source) {
      return NextResponse.json(
        { error: "Invalid raw intent: missing required fields (expression, source)" },
        { status: 400 }
      );
    }

    // SERVER-SIDE ONLY: Resolve semantic intent - preserves Presentation Composition Invariant
    const { resolution, context, domainType } = resolveSemanticIntent(rawIntent.expression);
    console.log("[API/INTENT/CREATE] 🔍 Semantically resolved on server:", domainType, resolution.context);
    
    // Create canonical IntentContract with server-resolved semantics
    const intent: IntentContract = {
      id: crypto.randomUUID(),
      expression: rawIntent.expression,
      source: rawIntent.source,
      context,
      resolution,
      status: "draft",
      createdAt: new Date().toISOString()
    };

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