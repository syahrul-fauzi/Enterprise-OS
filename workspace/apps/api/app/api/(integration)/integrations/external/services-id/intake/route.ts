import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { decodeWorkspaceSession } from "@repo/core-kernel/auth/decode-workspace-session";

// Lazy initialization untuk Node.js modules (hindari Edge Runtime static analysis warning)
let randomUUID: () => string;
let initIdentitySchema: () => Promise<void>;

async function initNodeRuntime() {
  if (!randomUUID) {
    if (typeof EdgeRuntime !== "undefined") {
      randomUUID = () => globalThis.crypto.randomUUID();
    } else {
      const { randomUUID: nodeRandomUUID } = await import("node:crypto");
      randomUUID = nodeRandomUUID;
    }
  }
  
  if (!initIdentitySchema) {
    const { initIdentitySchema: importedInit } = await import("@repo/capabilities-identity");
    initIdentitySchema = importedInit;
  }
}

// S.ID-EXT-001: External Work Intake API untuk Services.ID
// Hanya menerima input external, memproses ke canonical Intent/Work pipeline EOS
// Route ini adalah SYSTEM SURFACE (bukan FACE-bound): untuk programmatic/external consumer, API key auth

export async function POST(request: Request) {
  try {
    // Inisialisasi Node.js modules terlebih dahulu
    await initNodeRuntime();
    
    // Validasi signature API key untuk keamanan external call (System Surface requirement)
    const apiKey = request.headers.get("x-services-id-api-key");
    if (!apiKey || process.env.SERVICES_ID_EXTERNAL_API_KEY !== apiKey) {
      console.log("[services-id/intake] ❌ Unauthorized: Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Canonical auth: gunakan decodeWorkspaceSession untuk validasi context (meskipun system surface)
    const session = await decodeWorkspaceSession(request);
    if (!session?.tenantId || !session?.workspaceId) {
      return NextResponse.json(
        { error: "Invalid workspace context: missing tenant or workspace ID" },
        { status: 400 }
      );
    }

    // Non-null assertion setelah validasi eksplisit untuk menghilangkan linter error
    const workspaceId = session.workspaceId;
    const tenantId = session.tenantId;

    const externalInput = await request.json();
    console.log("[services-id/intake] ✅ Authorized: Received external input", externalInput);
    
    // Validasi required fields untuk external intake
    if (!externalInput.content || !externalInput.source || !externalInput.external_reference_id) {
      return NextResponse.json(
        { error: "Invalid external input: missing required fields (content, source, external_reference_id)" },
        { status: 400 }
      );
    }

    // Inisialisasi schema identity
    await initIdentitySchema();
    
    // Generate intent ID unik untuk tracking
    const intentId = `intent_${randomUUID()}`;
    
    // PURE ADAPTER PATTERN: route HANYA memanggil capabilityRegistry.invoke()
    // Menggunakan command kanonis createExternalIntent dari identity capability
    const savedIntent = await capabilityRegistry.invoke(
      "identity",
      "createExternalIntent",
      {
        id: intentId,
        title: "External Service Request from Services.ID",
        description: externalInput.content,
        origin: "external_system",
        category: "SERVICE_REQUEST",
        status: "RECEIVED",
        actorId: session.actorId || "user-41d8e2db-ada4-4524-9643-cb4e22c4952d",
        tenantId: tenantId, // Gunakan tenantId dari session yang tervalidasi
        workspaceId: workspaceId, // Gunakan workspaceId dari session yang tervalidasi
        raw: {
          type: "request",
          content: externalInput.content
        },
        metadata: {
          source: externalInput.source,
          external_reference_id: externalInput.external_reference_id
        }
      }
    );
    
    console.log("[services-id/intake] ✅ Intent persisted via canonical capability:", savedIntent.id);

    // Return canonical response untuk external consumer (System Surface requirement)
    return NextResponse.json({
      success: true,
      intent_id: savedIntent.id,
      status: "received",
      message: "External intent successfully ingested into System Surface"
    });

  } catch (error) {
    console.error("[services-id/intake] ❌ Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing external intent" },
      { status: 500 }
    );
  }
}