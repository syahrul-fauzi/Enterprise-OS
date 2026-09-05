import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import {
  getIntentRepositoryPostgres,
  initIdentitySchema,
  IntentId,
  type IntentOrigin,
  type IntentRawInput,
} from "@repo/capabilities-identity";
// Import universal intent pipeline untuk canonical work formation
import { intentUnderstandingService, createUniversalExpression } from "../../../../../../../capabilities/atomic-composition/implementation/services/intent-understanding.service";
import { intentInteractionEngine } from "../../../../../../../capabilities/atomic-composition/implementation/services/intent-interaction-engine";
import type { UniversalIntentInput } from "../../../../../../../capabilities/atomic-composition/implementation/contracts/universal-intent.contracts";
import type { IntentContract } from "@repo/presentation-features";

// S.ID-EXT-001: External Work Intake API untuk Services.ID
// Hanya menerima input external, memproses ke canonical Intent/Work pipeline EOS
// TIDAK membuat lifecycle baru, menggunakan existing /api/intent/create logic dengan origin khusus external

const GLOBAL_INTENT_STORE_KEY = Symbol.for('eos.face.intent.store.v1');
declare function getGlobalIntentStore(): Map<string, any>;
const intentStore = getGlobalIntentStore();

export async function POST(request: Request) {
  try {
    // Validasi signature API key untuk keamanan external call
    const apiKey = request.headers.get("x-services-id-api-key");
    if (!apiKey || process.env.SERVICES_ID_EXTERNAL_API_KEY !== apiKey) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      );
    }

    const externalInput = await request.json();
    
    // Validasi required fields untuk external intake
    if (!externalInput.content || !externalInput.source || !externalInput.external_reference_id) {
      return NextResponse.json(
        { error: "Invalid external input: missing required fields (content, source, external_reference_id)" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE)?.value;
    let session = existingCookie ? decodeWorkspaceSession(existingCookie) : null;
    let encodedSession: string | null = null;
    let createdNewAnonymousSession = false;

    // Buat anonymous session jika tidak ada session valid (external calls tanpa session)
    if (!session?.tenantId || !session?.workspaceId || !session.actorId) {
      session = createAnonymousWorkspaceSession();
      encodedSession = encodeWorkspaceSession(session);
      createdNewAnonymousSession = true;
    }

    const safeSession = session;

    // Map external source ke canonical IntentOrigin (selalu "external_system" untuk S.ID-EXT-001)
    const origin: IntentOrigin = "external_system";
    
    // Deteksi raw input type dari payload external
    const rawType = externalInput.raw?.type || "request";
    const rawContent = externalInput.raw?.content || externalInput.content;

    console.log("[API/EXTERNAL/SERVICES-ID/INTAKE] Raw external input parsed:", JSON.stringify(externalInput, null, 2));
    console.log("[API/EXTERNAL/SERVICES-ID/INTAKE] Mapped to origin:", origin, "rawType:", rawType);

    // Buat universal intent input sesuai kontrak EOS
    const universalInput: UniversalIntentInput = {
      origin,
      actorId: safeSession.actorId,
      raw: {
        type: rawType,
        content: rawContent
      },
      metadata: {
        external_reference_id: externalInput.external_reference_id,
        source_platform: externalInput.source,
        external_metadata: externalInput.metadata || {}
      }
    };

    // Jalankan universal expression lifecycle pipeline (Canonical EOS Entry)
    const universalExpression = await createUniversalExpression(
      universalInput,
      safeSession.tenantId,
      safeSession.workspaceId,
      safeSession.actorId
    );

    console.log("[API/EXTERNAL/SERVICES-ID/INTAKE] 🚀 External universal expression created:", universalExpression.id, "status:", universalExpression.status, "origin:", universalExpression.origin);

    // Proses dengan intent interaction engine untuk memastikan pemahaman yang benar
    const interactionResult = await intentInteractionEngine.process({
      expression: rawContent,
      source: "external",
      entryPoint: "services-id-external-intake",
      actorId: safeSession.actorId,
      context: {
        tenantId: safeSession.tenantId,
        workspaceId: safeSession.workspaceId,
        external_reference_id: externalInput.external_reference_id
      }
    });

    console.log("[API/EXTERNAL/SERVICES-ID/INTAKE] ⚙️ External interaction processed:", interactionResult.state.id, "confidence:", interactionResult.understanding.confidence);

    // Cek apakah bisa membentuk Work dari intent ini
    const canFormWork = universalExpression.understanding?.canFormWork ?? false;
    const topHypothesis = interactionResult.understanding?.hypotheses?.[0];
    
    // Deteksi permintaan layanan Services.ID yang valid
    const isServiceRequest = rawContent.toLowerCase().match(/\blayanan|request|permintaan|jasa\b/);
    
    // Simpan intent ke repository jika bisa membentuk Work
    let intent: IntentContract | null = null;
    if (canFormWork && isServiceRequest) {
      const defaultResolution = { objective: `External service request: ${rawContent.substring(0, 100)}` };
      intent = {
        id: universalExpression.id,
        expression: rawContent,
        source: {
          actorType: "external",
          entryPoint: "services-id-external-intake",
          timestamp: new Date().toISOString()
        },
        context: universalExpression.understanding?.context || externalInput.context || {},
        resolution: universalExpression.understanding?.state?.goal ? { objective: universalExpression.understanding.state.goal } : defaultResolution,
        status: "draft",
        createdAt: new Date().toISOString()
      };

      // Simpan ke PostgreSQL untuk persistence
      if (process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING) {
        await initIdentitySchema();
        const intentRepository = getIntentRepositoryPostgres();
        
        if (intent) {
          const rawInput: IntentRawInput = {
            type: rawType,
            content: rawContent
          };

          // Konversi ke IntentAggregate sesuai kontrak identity capability
          const intentAggregate = {
            id: IntentId(universalExpression.id),
            tenantId: safeSession.tenantId,
            workspaceId: safeSession.workspaceId,
            actorId: safeSession.actorId,
            origin,
            raw: rawInput,
            title: `External Service Request: ${externalInput.external_reference_id}`,
            description: externalInput.description || `Received from ${externalInput.source}`,
            category: "SERVICE_REQUEST", // Map ke canonical IntentCategory
            status: "RECEIVED",
            metadata: {
              external_reference_id: externalInput.external_reference_id,
              source_platform: externalInput.source
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await intentRepository.save(intentAggregate);
          console.log("[API/EXTERNAL/SERVICES-ID/INTAKE] ✅ External intent saved to repository:", intentAggregate.id);
        }
      }
    }

    // Siapkan response untuk external caller
    const response = NextResponse.json({
      success: true,
      external_reference_id: externalInput.external_reference_id,
      eos_intent_id: universalExpression.id,
      canFormWork,
      message: "External work intake processed successfully, mapped to canonical EOS work pipeline",
      status_url: `/api/intent/${universalExpression.id}`
    }, { status: 201 });

    // Set cookie jika buat session baru
    if (createdNewAnonymousSession && encodedSession) {
      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: encodedSession,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;

  } catch (error) {
    console.error("[API/EXTERNAL/SERVICES-ID/INTAKE] Error processing external intake:", error);
    return NextResponse.json(
      { error: "Failed to process external work intake", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}