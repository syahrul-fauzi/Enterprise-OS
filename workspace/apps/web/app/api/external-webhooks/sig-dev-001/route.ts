import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { safeRecordEvidence } from "../../../../../capabilities/work-core/implementation/utils/evidence.utils.js";

// SIG-DEV-001: DEV-ONLY synthetic signature webhook - PRODUCTION DISABLED
// Provider-neutral boundary untuk menguji external commitment flow tanpa dependensi provider spesifik
// Hanya menerima synthetic evidence untuk development testing SIG-DEV-001 slice
export async function POST(request: Request) {
  try {
    // Block in production - hanya aktif di development environment
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ 
        error: "SIG-DEV-001 webhook is disabled in production" 
      }, { status: 403 });
    }

    const payload = await request.json();
    const { workId, signerId, signatureEvidence, sessionId, tenantId, workspaceId } = payload;

    // Validate required fields sesuai SIG-DEV-001 acceptance criteria
    if (!workId || !signerId || !signatureEvidence || !sessionId || !tenantId || !workspaceId) {
      return NextResponse.json({ 
        error: "Missing required fields: workId, signerId, signatureEvidence, sessionId, tenantId, workspaceId are mandatory" 
      }, { status: 400 });
    }

    // Validate bahwa ini adalah synthetic evidence (khusus development)
    if (signatureEvidence.type !== "synthetic-signature") {
      return NextResponse.json({ 
        error: "SIG-DEV-001 only accepts synthetic-signature evidence" 
      }, { status: 400 });
    }

    // 1. Record signature evidence menggunakan existing safeRecordEvidence
    // Memenuhi acceptance criteria #3 & #4: masuk melalui existing evidence contract + integrity metadata
    const evidenceRecord = await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "work-core",
      command: "signature.received",
      work_id: workId,
      tenant_id: tenantId,
      actor_id: signerId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      // Metadata khusus signature
      meta_signatureType: signatureEvidence.type,
      meta_signatureDigest: signatureEvidence.digest,
      meta_signatureTimestamp: signatureEvidence.timestamp
    });

    if (!evidenceRecord.ok) {
      throw new Error("Failed to record signature evidence");
    }

    // 2. Invoke updateWork untuk transisi state signature
    // Memenuhi acceptance criteria #11: pakai existing mutation contract
    const { output: updateResult } = await capabilityRegistry.invoke("work-core", "update", {
      workId: workId,
      actorId: signerId,
      workspaceId: workspaceId,
      sessionId: sessionId,
      tenantId: tenantId,
      // Version akan diambil dari work yang ada - framework handle optimistic concurrency
      version: 0, // Akan diganti dengan versi aktual oleh work.commands.ts internal logic
      updates: {
        status: "SIGNATURE_COMPLETE", // Ini akan divalidasi oleh updateWork() SIG-DEV-001 checks
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Synthetic signature evidence processed successfully",
      evidenceRecorded: evidenceRecord.ok,
      workUpdated: updateResult?.success,
      newVersion: updateResult?.version
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SIG-DEV-001] Processing failed:", message);
    return NextResponse.json({ 
      ok: false, 
      error: message 
    }, { status: 500 });
  }
}