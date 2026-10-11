import { NextResponse } from "next/server";
import { handleSignatureProviderWebhookUpdate } from "../../../../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service.js";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";

// SIG-NET-001: Provider-agnostic signature provider webhook endpoint
// Memproses webhook dari DocuSign, Adobe Sign, atau provider lain dengan tetap mempertahankan boundary provider-neutral
// Hanya menerima payload yang sudah dimap ke schema universal signature provider
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { 
      envelopeId, 
      workId, 
      signerEmail, 
      signerName, 
      signatureStatus, 
      signedAt, 
      providerName, 
      eventType 
    } = payload;

    // Validate required fields sesuai universal adapter contract
    if (!envelopeId || !workId || !signerEmail || !signerName || !signatureStatus || !providerName || !eventType) {
      return NextResponse.json({ 
        error: "Missing required fields: envelopeId, workId, signerEmail, signerName, signatureStatus, providerName, eventType are mandatory" 
      }, { status: 400 });
    }

    // Validate supported signature statuses (provider-agnostic)
    const validStatuses = ["sent", "delivered", "completed", "declined", "voided"];
    if (!validStatuses.includes(signatureStatus)) {
      return NextResponse.json({ 
        error: `Invalid signatureStatus: must be one of ${validStatuses.join(", ")}` 
      }, { status: 400 });
    }

    // Panggil universal handler dari connector-ecosystem - reuse semua logic existing
    const result = await handleSignatureProviderWebhookUpdate({
      envelopeId,
      workId,
      signerEmail,
      signerName,
      signatureStatus: signatureStatus as any,
      signedAt: signedAt || Date.now(),
      providerName,
      eventType
    });

    if (!result.success) {
      return NextResponse.json({ 
        success: false,
        error: result.error 
      }, { status: 500 });
    }

    // Jika signature completed, invoke updateWork untuk finalisasi state (reuse existing mutation contract)
    if (signatureStatus === "completed") {
      const { output: updateResult } = await capabilityRegistry.invoke("work-core", "update", {
        workId: workId,
        actorId: `signature-provider:${providerName}`,
        workspaceId: "default-workspace", // Akan diambil dari work yang ada oleh internal logic
        sessionId: (global as any).currentSessionId || "default-session",
        tenantId: "default-tenant",
        version: 0, // Diganti dengan versi aktual oleh work.commands.ts
        updates: {
          status: "SIGNATURE_COMPLETE"
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Signature ${providerName} processed successfully for envelope ${envelopeId}`,
        workId: result.workId,
        workUpdated: updateResult?.success,
        signatureStatus: "completed"
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Signature provider event processed: ${signatureStatus}`,
      workId: result.workId
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SIG-NET-001] Processing failed:", message);
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}