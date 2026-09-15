import { NextResponse } from "next/server";
import {
  getIntentRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity";
import { randomUUID } from "crypto";

// S.ID-EXT-001: External Work Intake API untuk Services.ID
// Hanya menerima input external, memproses ke canonical Intent/Work pipeline EOS
// TIDAK membuat lifecycle baru, menggunakan existing /api/intent/create logic dengan origin khusus external
// Route ini adalah SYSTEM SURFACE (bukan FACE-bound): untuk programmatic/external consumer, API key auth

export async function POST(request: Request) {
  try {
    // Validasi signature API key untuk keamanan external call (System Surface requirement)
    const apiKey = request.headers.get("x-services-id-api-key");
    if (!apiKey || process.env.SERVICES_ID_EXTERNAL_API_KEY !== apiKey) {
      console.log("[services-id/intake] ❌ Unauthorized: Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      );
    }

    const externalInput = await request.json();
    console.log("[services-id/intake] ✅ Authorized: Received external input", externalInput);
    
    // Validasi required fields untuk external intake
    if (!externalInput.content || !externalInput.source || !externalInput.external_reference_id) {
      return NextResponse.json(
        { error: "Invalid external input: missing required fields (content, source, external_reference_id)" },
        { status: 400 }
      );
    }

    // Inisialisasi schema dan repository (sesuai dengan @repo/capabilities-identity)
    await initIdentitySchema();
    const intentRepository = getIntentRepositoryPostgres();
    
    // Generate intent ID unik untuk tracking
    const intentId = `intent_${randomUUID()}`;
    
    // Simpan intent ke PostgreSQL (E-07 requirement: must persist to DB) - sesuai schema IntentAggregate
    const savedIntent = await intentRepository.save({
      id: intentId,
      title: "External Service Request from Services.ID",
      description: externalInput.content,
      origin: "external_system",
      category: "SERVICE_REQUEST",
      status: "RECEIVED",
      actorId: "user-41d8e2db-ada4-4524-9643-cb4e22c4952d", // Gunakan UserId yang valid dari Postgres
      tenantId: "tenant-001",
      workspaceId: "workspace-001",
      createdAt: new Date(),
      updatedAt: new Date(),
      raw: {
        type: "request",
        content: externalInput.content
      },
      metadata: {
        source: externalInput.source,
        external_reference_id: externalInput.external_reference_id
      }
    });
    
    console.log("[services-id/intake] ✅ Intent persisted to PostgreSQL:", savedIntent.id);

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