import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleBpjphWebhookUpdate } from "../../services/connector-ecosystem.service.js";

/**
 * BPJPH Indonesia Halal Certification Webhook Handler
 * Follows EXACT same pattern as BPJS, DJKI, and ILC webhooks (Universal Adapter Contract)
 * Implements IP whitelisting, signature verification, schema validation, and canonical Work persistence
 * Reuses gov-api-standard composition for Indonesian government API integration patterns
 * 
 * Part of W1.2: IDN-BPJPH (BPJPH-001: Indonesian BPJPH Hajj Registration Sync)
 * Follows UU No. 33 Tahun 2014 tentang Jaminan Produk Halal requirements
 */

// BPJPH Halal Certification webhook payload schema (aligned with BPJPH API v2.1 specs)
const BpjphHalalCertificationWebhookPayloadSchema = z.object({
  halal_certification_id: z.string().describe("BPJPH halal certification registration ID"),
  halal_certification_number: z.string().describe("Official BPJPH halal certificate number once issued"),
  status: z.enum([
    "submitted", "document_review", "inspection_scheduled", "inspection_completed", "issued", "rejected", "expired"
  ]).describe("Current status of the halal certification process"),
  service_code: z.string().describe("BPJPH service code (PENDAFTARAN/REVIEW/INSPEKSI/SERTIFIKAT)"),
  registered_at: z.string().describe("ISO timestamp of initial certification registration"),
  updated_at: z.string().describe("ISO timestamp of this status update"),
  notes: z.string().optional().describe("BPJPH reviewer notes or additional information"),
  signature: z.string().describe("BPJPH HMAC-SHA256 signature for request verification")
});

// BPJPH production IP ranges (sandbox + production) - from BPJPH developer documentation
const BPJPH_ALLOWED_IPS = new Set([
  // BPJPH sandbox IPs
  "103.110.20.15", "103.110.20.16",
  // BPJPH production IPs
  "203.153.235.10", "203.153.235.11", "203.153.235.12",
  // Local development IPs
  "127.0.0.1", "::1"
]);

// Helper function to validate IP address (reused from all government API connectors)
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  // Handle CIDR notation if present (simplified implementation)
  for (const allowedIp of allowedIps) {
    if (allowedIp.includes('/')) {
      // For CIDR ranges, basic prefix matching (production uses full CIDR check)
      const ipPrefix = allowedIp.split('/')[0];
      if (ipPrefix && clientIp.startsWith(ipPrefix.split('.').slice(0, 3).join('.'))) {
        return true;
      }
    } else if (clientIp === allowedIp) {
      return true;
    }
  }
  return false;
}

// Verify BPJPH HMAC-SHA256 signature (reuses BPJS/DJKI signature verification pattern)
async function verifyBpjphSignature(body: string, jsonBody: any): Promise<boolean> {
  if (!process.env.BPJPH_API_SECRET) {
    console.error("[BPJPH Halal Webhook] BPJPH_API_SECRET environment variable not set");
    return false;
  }
  try {
    // Create signature string following BPJPH specification
    const signatureString = `${jsonBody.halal_certification_id}${jsonBody.status}${jsonBody.updated_at}${process.env.BPJPH_API_SECRET}`;
    const hmac = crypto.createHmac('sha256', process.env.BPJPH_API_SECRET);
    const digest = hmac.update(signatureString).digest('hex');
    const verified = digest === jsonBody.signature;
    console.log(`[BPJPH Halal Webhook] BPJPH signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[BPJPH Halal Webhook] Error during signature verification", error);
    return false;
  }
}

// POST handler for halal certification status updates - implements full Universal Adapter Contract
export async function POST(request: Request) {
  // 1. Extract client IP for IP whitelisting (security first)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }

  // 2. IP Whitelisting check - block unauthorized sources (Universal Adapter Contract requirement)
  if (!isIpAllowed(clientIp, BPJPH_ALLOWED_IPS)) {
    console.warn(`[BPJPH Halal Webhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  // 3. Read and parse request body
  const body = await request.text();
  try {
    var jsonBody = JSON.parse(body);
  } catch (error) {
    console.error("[BPJPH Halal Webhook] Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // 4. Signature verification - ensure request integrity (government API security requirement)
  const signatureValid = await verifyBpjphSignature(body, jsonBody);
  if (!signatureValid) {
    console.error("[BPJPH Halal Webhook] Invalid signature - request rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 5. Schema validation - ensure payload matches BPJPH API specification
  const validated = BpjphHalalCertificationWebhookPayloadSchema.safeParse(jsonBody);
  if (!validated.success) {
    console.error("[BPJPH Halal Webhook] Invalid payload format", validated.error);
    return NextResponse.json({ 
      error: "Invalid payload", 
      details: validated.error.format() 
    }, { status: 400 });
  }

  // 6. Delegate to canonical service handler that preserves Work Continuity
  // This is the same pattern as BPJS/DJKI/ILC: webhook layer only handles security/validation
  // All business logic and state mutations go through the shared connector service
  const result = await handleBpjphWebhookUpdate(validated.data);
  
  if (result.success) {
    console.log(`[BPJPH Halal Webhook] Successfully processed BPJPH certification ${validated.data.halal_certification_id}, EOS workId: ${result.workId}`);
    return NextResponse.json({ 
      success: true, 
      workId: result.workId,
      message: "BPJPH halal certification status update processed successfully"
    }, { status: 200 });
  } else {
    console.error(`[BPJPH Halal Webhook] Processing failed for BPJPH certification ${validated.data.halal_certification_id}: ${result.error}`);
    return NextResponse.json({ 
      error: result.error 
    }, { status: 500 });
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

  if (!isIpAllowed(clientIp, BPJPH_ALLOWED_IPS)) {
    console.error(`[BPJPH Halal Webhook] Blocked verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  // BPJPH platform webhook verification logic (follows standard webhook pattern)
  if (mode === "subscribe" && token === process.env.BPJPH_API_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: "BPJPH halal certification webhook endpoint active" }, { status: 200 });
}