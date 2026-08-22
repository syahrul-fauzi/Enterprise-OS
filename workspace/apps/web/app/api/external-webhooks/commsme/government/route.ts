import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

// Minimal webhook endpoint to receive external system responses (OSS, Kemenkumham, DJP)
// Follows existing Next.js API route pattern from governance/decisions/route.ts and service-requests/list/route.ts
// No new capabilities - uses existing service-directory capability commands to update status
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { system, serviceRequestId, status, responseData, externalReferenceId } = payload;

    // Validate required fields for World Truth capture
    if (!system || !serviceRequestId || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: system, serviceRequestId, status are mandatory" 
      }, { status: 400 });
    }

    // Validate supported external systems
    const supportedSystems = ["oss", "kemenkumham", "djp"];
    if (!supportedSystems.includes(system)) {
      return NextResponse.json({ 
        error: `Unsupported system. Supported systems: ${supportedSystems.join(", ")}` 
      }, { status: 400 });
    }

    // Use existing service-directory capability to update service request with external response data
    // Follows SHARED RAIL pattern: uses session from test identity context (matches execute/route.ts)
    const COM_SESSION_ID = "session-test-001";
    const { output } = await capabilityRegistry.invoke("service-directory", "updateExternalSystemStatus", {
      id: serviceRequestId,
      externalSystem: system,
      externalStatus: status,
      externalReferenceId,
      responseData,
      receivedAt: new Date().toISOString(),
      sessionId: COM_SESSION_ID
    });

    // C21: Extract idempotency key from request headers and acknowledge external response
    // This links the external system's World Truth back to EOS's idempotency state machine
    const idempotencyKey = request.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const success = status === "success" || status === "completed" || status === "confirmed";
      capabilityRegistry.acknowledgeExternalResponse(idempotencyKey, success, externalReferenceId);
      console.log(`[webhook] Acknowledged external response for idempotency key: ${idempotencyKey}, success: ${success}`);
    } else {
      console.warn(`[webhook] No X-Idempotency-Key header found - cannot update idempotency state for serviceRequestId: ${serviceRequestId}`);
    }

    // Write evidence to CommsMe evidence store for World Truth verification (follows handoff record pattern)
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.writeFile(
      path.join('/root/Enterprise-OS/workspace/products/commsme/evidence', `external-response-${serviceRequestId}-${system}.json`),
      JSON.stringify({
        serviceRequestId,
        system,
        status,
        externalReferenceId,
        receivedAt: new Date().toISOString(),
        responseData,
        idempotencyKey,
        capabilityInvocationOutput: output
      }, null, 2)
    );

    return NextResponse.json({ 
      success: true, 
      message: `${system} response received and stored for service request ${serviceRequestId}`,
      output 
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[webhook error]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}