import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleBpjsKesehatanWebhookUpdate } from "../../services/connector-ecosystem.service.js";

/**
 * BPJS Kesehatan Healthcare Webhook Handler
 * Follows EXACT same pattern as BPJS Ketenagakerjaan/DJKI/Midtrans webhooks (Universal Adapter Contract)
 * Implements IP whitelisting, signature verification, schema validation, and canonical Work persistence
 * Reuses gov-api-standard composition for government API integration patterns
 * 
 * Part of W-INDUSTRY-001-04: BPJS Kesehatan webhook integration (HEALTH-001-04)
 * Follows Permenkes RI No. 28 Tahun 2014 tentang Rekam Medis requirements
 */

// BPJS Kesehatan webhook payload schema (aligned with BPJS Healthcare API specs)
const BpjsKesehatanWebhookPayloadSchema = z.object({
  claim_id: z.string().describe("BPJS healthcare claim registration ID"),
  claim_number: z.string().describe("Official BPJS claim registration number"),
  claim_status: z.enum([
    "submitted", "under_review", "approved", "rejected", "paid", "suspended"
  ]).describe("Current status of the healthcare claim"),
  service_code: z.string().describe("BPJS service code (DAFTPAS/KLAIMSE/RUJUKAN)"),
  patient_count: z.number().int().min(0).describe("Number of patients on this claim"),
  registered_at: z.string().describe("ISO timestamp of claim submission"),
  updated_at: z.string().describe("ISO timestamp of this status update"),
  notes: z.string().optional().describe("BPJS reviewer notes or additional medical information"),
  signature: z.string().describe("BPJS HMAC-SHA256 signature for request verification")
});

// BPJS Kesehatan production IP ranges (sandbox + production) - from BPJS developer documentation
const BPJS_KESEHATAN_ALLOWED_IPS = new Set([
  // BPJS sandbox IPs
  "103.190.26.20", "103.190.26.21",
  // BPJS production IPs
  "203.153.211.20", "203.153.211.21", "203.153.211.22",
  // Local development IPs
  "127.0.0.1", "::1"
]);

// Helper function to validate IP address (reused from all webhook patterns)
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  // Handle CIDR notation if present (simplified implementation)
  for (const allowedIp of allowedIps) {
    if (allowedIp.includes('/')) {
      // For CIDR ranges, basic prefix matching (production would use full CIDR check)
      const ipPrefix = allowedIp.split('/')[0];
      if (clientIp.startsWith(ipPrefix.split('.').slice(0, 3).join('.'))) {
        return true;
      }
    } else if (clientIp === allowedIp) {
      return true;
    }
  }
  return false;
}

// Verify BPJS HMAC-SHA256 signature (reuses BPJS Ketenagakerjaan signature verification pattern)
async function verifyBpjsKesehatanSignature(body: string, jsonBody: any): Promise<boolean> {
  if (!process.env.BPJS_KESEHATAN_API_SECRET) {
    console.error("[BPJS Kesehatan Webhook] BPJS_KESEHATAN_API_SECRET environment variable not set");
    return false;
  }
  try {
    // Create signature string following BPJS Healthcare specification
    const signatureString = `${jsonBody.claim_id}${jsonBody.claim_status}${jsonBody.updated_at}${process.env.BPJS_KESEHATAN_API_SECRET}`;
    const hmac = crypto.createHmac('sha256', process.env.BPJS_KESEHATAN_API_SECRET);
    const digest = hmac.update(signatureString).digest('hex');
    const verified = digest === jsonBody.signature;
    console.log(`[BPJS Kesehatan Webhook] BPJS signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[BPJS Kesehatan Webhook] Error during signature verification", error);
    return false;
  }
}

// POST handler for healthcare claim status updates - implements full Universal Adapter Contract
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
  if (!isIpAllowed(clientIp, BPJS_KESEHATAN_ALLOWED_IPS)) {
    console.warn(`[BPJS Kesehatan Webhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  // 3. Read and parse request body
  const body = await request.text();
  try {
    var jsonBody = JSON.parse(body);
  } catch (error) {
    console.error("[BPJS Kesehatan Webhook] Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // 4. Signature verification - ensure request integrity (government API security requirement)
  const signatureValid = await verifyBpjsKesehatanSignature(body, jsonBody);
  if (!signatureValid) {
    console.error("[BPJS Kesehatan Webhook] Invalid signature - request rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 5. Schema validation - ensure payload matches BPJS Healthcare API specification
  const validated = BpjsKesehatanWebhookPayloadSchema.safeParse(jsonBody);
  if (!validated.success) {
    console.error("[BPJS Kesehatan Webhook] Invalid payload format", validated.error);
    return NextResponse.json({ 
      error: "Invalid payload", 
      details: validated.error.format() 
    }, { status: 400 });
  }

  // 6. Delegate to canonical service handler that preserves Work Continuity
  // This is the same pattern as all other webhooks: webhook layer only handles security/validation
  // All business logic and state mutations go through the shared connector service
  const result = await handleBpjsKesehatanWebhookUpdate(validated.data);
  
  if (result.success) {
    console.log(`[BPJS Kesehatan Webhook] Successfully processed healthcare claim ${validated.data.claim_id}, EOS workId: ${result.workId}`);
    return NextResponse.json({ 
      success: true, 
      workId: result.workId,
      message: "BPJS Kesehatan claim status update processed successfully"
    }, { status: 200 });
  } else {
    console.error(`[BPJS Kesehatan Webhook] Processing failed for healthcare claim ${validated.data.claim_id}: ${result.error}`);
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

  if (!isIpAllowed(clientIp, BPJS_KESEHATAN_ALLOWED_IPS)) {
    console.warn(`[BPJS Kesehatan Webhook] Rejected verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  return NextResponse.json({ 
    status: "BPJS Kesehatan Healthcare webhook endpoint active - canonical connector-ecosystem implementation",
    api_version: "1.0.0",
    integrated_with: "gov-api-standard composition",
    cmbcd_execution_frame: "mcp" // Explicitly declares CMBCD execution frame for this external system
  }, { status: 200 });
}