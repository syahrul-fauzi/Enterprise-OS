import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleDjkiWebhookUpdate } from "../../services/connector-ecosystem.service.js";

/**
 * DJKI (Direktorat Jenderal Kekayaan Intelektual) Webhook Handler
 * Follows EXACT same pattern as Midtrans webhook (Universal Adapter Contract)
 * Implements IP whitelisting, signature verification, schema validation, and canonical Work persistence
 * Reuses gov-api-standard composition for government API integration patterns
 * 
 * Part of W-COM-003: Commercial Integration Baseline
 */

// DJKI Trademark Registration webhook payload schema (aligned with DJKI sandbox API specs)
const DjkiWebhookPayloadSchema = z.object({
  application_id: z.string().describe("DJKI trademark application ID"),
  application_number: z.string().describe("Official DJKI application number"),
  status: z.enum([
    "submitted", "under_review", "request_additional_docs", 
    "approved", "rejected", "published", "registered"
  ]).describe("Current status of the trademark application"),
  service_code: z.string().describe("DJKI service code (e.g., PENDMEREK for trademark registration)"),
  submitted_at: z.string().describe("ISO timestamp of application submission"),
  updated_at: z.string().describe("ISO timestamp of this status update"),
  notes: z.string().optional().describe("Reviewer notes or additional information"),
  signature: z.string().describe("DJKI HMAC-SHA256 signature for request verification")
});

// DJKI production IP ranges (sandbox + production) - from DJKI developer documentation
const DJKI_ALLOWED_IPS = new Set([
  // DJKI sandbox IPs
  "103.190.25.10", "103.190.25.11",
  // DJKI production IPs
  "203.153.210.10", "203.153.210.11", "203.153.210.12",
  // Local development IPs
  "127.0.0.1", "::1"
]);

function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

/**
 * DJKI signature verification follows HMAC-SHA256 standard
 * Signature string: `${application_id}${status}${updated_at}${process.env.DJKI_API_SECRET}`
 * Verifies that the request originated from DJKI servers
 */
async function verifyDjkiSignature(body: string, jsonBody: any): Promise<boolean> {
  if (!process.env.DJKI_API_SECRET) {
    console.error("[DjkiWebhook] DJKI_API_SECRET environment variable not set");
    return false;
  }

  try {
    const signatureString = `${jsonBody.application_id}${jsonBody.status}${jsonBody.updated_at}${process.env.DJKI_API_SECRET}`;
    const hmac = crypto.createHmac('sha256', process.env.DJKI_API_SECRET);
    const digest = hmac.update(signatureString).digest('hex');
    
    const verified = digest === jsonBody.signature;
    console.log(`[DjkiWebhook] DJKI signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[DjkiWebhook] Error during signature verification", error);
    return false;
  }
}

export async function POST(request: Request) {
  // Extract client IP from X-Forwarded-For (same pattern as Midtrans)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }

  // 1. IP validation first (security boundary)
  if (!isIpAllowed(clientIp, DJKI_ALLOWED_IPS)) {
    console.warn(`[DjkiWebhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  // 2. Read and parse request body
  const body = await request.clone().text();
  let jsonBody;
  try {
    jsonBody = JSON.parse(body);
  } catch (error) {
    console.error("[DjkiWebhook] Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  
  // 3. Verify DJKI signature (authenticity check)
  const signatureValid = await verifyDjkiSignature(body, jsonBody);
  if (!signatureValid) {
    console.error("[DjkiWebhook] Invalid DJKI signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 4. Validate payload schema against DJKI specs
  const validated = DjkiWebhookPayloadSchema.safeParse(jsonBody);
  if (!validated.success) {
    console.error("[DjkiWebhook] Invalid payload format", validated.error);
    return NextResponse.json({ 
      error: "Invalid payload", 
      details: validated.error.format() 
    }, { status: 400 });
  }

  // 5. Delegate to canonical service handler that preserves Work Continuity
  // This is the same pattern as Midtrans: webhook layer only handles security/validation
  // All business logic and state mutations go through the shared connector service
  const result = await handleDjkiWebhookUpdate(validated.data);
  
  if (result.success) {
    console.log(`[DjkiWebhook] Successfully processed DJKI application ${validated.data.application_id}, EOS workId: ${result.workId}`);
    return NextResponse.json({ 
      success: true, 
      workId: result.workId,
      message: "DJKI status update processed successfully"
    }, { status: 200 });
  } else {
    console.error(`[DjkiWebhook] Processing failed for DJKI application ${validated.data.application_id}: ${result.error}`);
    return NextResponse.json({ 
      error: result.error 
    }, { status: 500 });
  }
}