import { NextResponse } from "next/server";
import {
  initIdentitySchema,
} from "@repo/capabilities-identity";
import { randomUUID } from "crypto";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

// PROD-EXT-001: External Work Intake API untuk Product Delivery (PROD-001.1)
// Hanya menerima input external, memproses ke canonical Intent/Work pipeline EOS
// TIDAK membuat lifecycle baru, menggunakan existing delivery.createFromWork command dengan origin khusus external
// Route ini adalah SYSTEM SURFACE (bukan FACE-bound): untuk programmatic/external consumer, API key auth

export async function POST(request: Request) {
  try {
    // Validasi signature API key untuk keamanan external call (System Surface requirement)
    const apiKey = request.headers.get("x-product-delivery-api-key");
    if (!apiKey || process.env.PRODUCT_DELIVERY_EXTERNAL_API_KEY !== apiKey) {
      console.log("[product-delivery/intake] ❌ Unauthorized: Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      );
    }

    const externalInput = await request.json();
    console.log("[product-delivery/intake] ✅ Authorized: Received external input", externalInput);
    
    // Validasi required fields untuk external intake (sesuai createDeliveryFromWork schema)
    if (!externalInput.workId || !externalInput.coreWork || !externalInput.source || !externalInput.external_reference_id) {
      return NextResponse.json(
        { error: "Invalid external input: missing required fields (workId, coreWork, source, external_reference_id)" },
        { status: 400 }
      );
    }

    // Inisialisasi schema dan repository (sesuai dengan @repo/capabilities-identity)
    await initIdentitySchema();
    
    // Execute canonical PROD-001.1 command: delivery.createFromWork
    // HIGH-VALUE WORK GRAPH INTEGRATION: otomatis traverse Work→Product→Requirements
    const { output } = await capabilityRegistry.invoke("product-delivery", "delivery.createFromWork", {
      workId: externalInput.workId,
      coreWork: externalInput.coreWork,
      domainSpecificData: externalInput.domainSpecificData || {}
    }) as { output?: { id: string; workId: string; graphMetadata: unknown } };

    if (!output) {
      console.log("[product-delivery/intake] ❌ Failed to execute createDeliveryFromWork");
      return NextResponse.json(
        { error: "Internal server error: failed to create delivery from work" },
        { status: 500 }
      );
    }

    console.log("[product-delivery/intake] ✅ Delivery created from core Work successfully:", output.id);
    console.log("[product-delivery/intake] 🔗 High-Value Work Graph links created:", output.graphMetadata);

    // Return canonical response untuk external consumer (System Surface requirement)
    return NextResponse.json({
      success: true,
      delivery_id: output.id,
      work_id: output.workId,
      graph_metadata: output.graphMetadata,
      status: "created",
      message: "External delivery successfully ingested into EOS Work Continuity Substrate"
    });

  } catch (error) {
    console.error("[product-delivery/intake] ❌ Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing external delivery" },
      { status: 500 }
    );
  }
}