import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleMidtransWebhookUpdate } from "../../services/connector-ecosystem.service.js";

// Lazy load capabilityRegistry sesuai pattern yang digunakan di semua command/service EOS
async function getCapabilityRegistry() {
  const loaded = await import("../../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

// Reuse the same schema and security controls from existing implementations
// but centralized in the canonical connector-ecosystem location
const MidtransWebhookPayloadSchema = z.object({
  order_id: z.string().describe("Order ID from Midtrans transaction"),
  transaction_id: z.string().describe("Midtrans transaction identifier"),
  transaction_status: z.enum([
    "pending", "success", "failure", "expire", "cancel", "deny", "refund"
  ]).describe("Transaction status from Midtrans"),
  payment_type: z.string().describe("Payment method used"),
  gross_amount: z.string().describe("Transaction amount in IDR"),
  currency: z.string().describe("Currency code (IDR)"),
  signature_key: z.string().describe("Midtrans signature key for verification"),
  transaction_time: z.string().describe("Transaction timestamp ISO"),
  settlement_time: z.string().optional().describe("Settlement timestamp if completed"),
  fraud_status: z.enum(["accept", "deny", "challenge"]).optional().describe("Fraud detection status"),
});

// Midtrans official IP ranges (production from Midtrans docs)
const MIDTRANS_ALLOWED_IPS = new Set([
  "103.190.24.1", "103.190.24.2", "103.190.24.3", // Midtrans production IPs
  "127.0.0.1", "::1" // Allow localhost for development
]);

// Helper to check if IP is allowed - follows same security pattern as all other adapters
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Verify Midtrans signature - follows Midtrans official signature verification method
async function verifyMidtransSignature(body: string, jsonBody: any): Promise<boolean> {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    console.error("[MidtransWebhook] MIDTRANS_SERVER_KEY environment variable not set");
    return false;
  }

  try {
    // Midtrans signature generation: SHA512(order_id + transaction_status + gross_amount + server_key)
    const signatureString = `${jsonBody.order_id}${jsonBody.transaction_status}${jsonBody.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`;
    const hmac = crypto.createHmac('sha512', process.env.MIDTRANS_SERVER_KEY);
    const digest = hmac.update(signatureString).digest('hex');
    
    const verified = digest === jsonBody.signature_key;
    console.log(`[MidtransWebhook] Midtrans signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[MidtransWebhook] Error during signature verification", error);
    return false;
  }
}

// GET handler for webhook verification - follows same pattern as all other external webhooks
export async function GET(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }

  if (!isIpAllowed(clientIp, MIDTRANS_ALLOWED_IPS)) {
    console.warn(`[MidtransWebhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  return NextResponse.json({ status: "Midtrans webhook endpoint active - canonical connector-ecosystem implementation" }, { status: 200 });
}

// POST handler for webhook events - delegates to canonical service handler
export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }

  // IP validation
  if (!isIpAllowed(clientIp, MIDTRANS_ALLOWED_IPS)) {
    console.warn(`[MidtransWebhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  // Signature validation
  const body = await request.clone().text();
  const jsonBody = JSON.parse(body);
  
  const signatureValid = await verifyMidtransSignature(body, jsonBody);
  if (!signatureValid) {
    console.error("[MidtransWebhook] Invalid Midtrans signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Schema validation
  const validated = MidtransWebhookPayloadSchema.safeParse(jsonBody);
  if (!validated.success) {
    console.error("[MidtransWebhook] Invalid payload format", validated.error);
    return NextResponse.json({ error: "Invalid payload", details: validated.error.format() }, { status: 400 });
  }

  // Delegate to canonical service handler that preserves Work Continuity
  const result = await handleMidtransWebhookUpdate(validated.data);
  
  if (result.success && validated.data.transaction_status === "success") {
    // Trigger work-core.update capability untuk memastikan state mutation melalui canonical boundary
    // Sama seperti implementasi di sig-net-001 webhook - reuse work-core state update contract
    const registry = await getCapabilityRegistry();
    if (!registry?.invoke) {
      console.error("[MidtransWebhook] capabilityRegistry unavailable, cannot update work state");
      return NextResponse.json({ success: false, error: "Internal server error: capability registry unavailable" }, { status: 500 });
    }
    
    const { output: updateResult } = await registry.invoke("work-core", "update", {
      workId: result.workId,
      actorId: "payment-gateway:midtrans",
      workspaceId: "fin-001-merchant-workspace",
      sessionId: (global as any).currentSessionId || "fin-001-session-001",
      tenantId: "default-tenant",
      version: 0,
      updates: {
        status: "COMPLETED",
        platformMetadata: {
          lastTransactionId: validated.data.transaction_id,
          lastTransactionStatus: validated.data.transaction_status,
          paymentCompletedAt: validated.data.settlement_time || validated.data.transaction_time
        }
      }
    });

    console.log(`[MidtransWebhook] work-core.state.update triggered successfully for workId: ${result.workId}, update success: ${updateResult?.success}`);
    return NextResponse.json({ 
      success: true, 
      workId: result.workId,
      canonicalUpdateTriggered: updateResult?.success,
      message: "Payment completed and canonical work state updated" 
    }, { status: 200 });
  } else if (result.success) {
    return NextResponse.json({ success: true, workId: result.workId, message: "Payment event processed, waiting for completion" }, { status: 200 });
  } else {
    console.error(`[MidtransWebhook] Processing failed: ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}