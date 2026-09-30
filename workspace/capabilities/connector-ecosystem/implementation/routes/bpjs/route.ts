import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleBpjsWebhookUpdate } from "../../services/connector-ecosystem.service.js";

/**
 * BPJS Ketenagakerjaan Construction Webhook Handler
 * Follows EXACT same pattern as DJKI and Midtrans webhooks (Universal Adapter Contract)
 * Implements IP whitelisting, signature verification, schema validation, and canonical Work persistence
 * Reuses gov-api-standard composition for government API integration patterns
 * 
 * Part of SLICE-006: BPJS Construction webhook integration (CONS-001-03)
 * Follows UU No. 2 Tahun 2017 tentang Jasa Konstruksi requirements
 */

// BPJS Ketenagakerjaan Construction webhook payload schema (aligned with BPJS API specs)
const BpjsConstructionWebhookPayloadSchema = z.object({
  project_id: z.string().describe("BPJS construction project registration ID"),
  project_number: z.string().describe("Official BPJS project registration number"),
  project_status: z.enum([
    "registered", "active", "suspended", "completed", "terminated"
  ]).describe("Current status of the construction project"),
  service_code: z.string().describe("BPJS service code (PENDPROJ/DAFTTKJ/LAPPROY)"),
  worker_count: z.number().int().min(0).describe("Number of workers registered on this project"),
  registered_at: z.string().describe("ISO timestamp of project registration"),
  updated_at: z.string().describe("ISO timestamp of this status update"),
  notes: z.string().optional().describe("BPJS reviewer notes or additional information"),
  signature: z.string().describe("BPJS HMAC-SHA256 signature for request verification")
});

// BPJS production IP ranges (sandbox + production) - from BPJS developer documentation
const BPJS_ALLOWED_IPS = new Set([
  // BPJS sandbox IPs
  "103.190.26.10", "103.190.26.11",
  // BPJS production IPs
  "203.153.211.10", "203.153.211.11", "203.153.211.12",
  // Local development IPs
  "127.0.0.1", "::1"
]);

// Helper function to validate IP address (reused from DJKI/Midtrans patterns)
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

// Verify BPJS HMAC-SHA256 signature (reuses DJKI signature verification pattern)
async function verifyBpjsSignature(body: string, jsonBody: any): Promise<boolean> {
  if (!process.env.BPJS_API_SECRET) {
    console.error("[BPJS Construction Webhook] BPJS_API_SECRET environment variable not set");
    return false;
  }
  try {
    // Create signature string following BPJS specification
    const signatureString = `${jsonBody.project_id}${jsonBody.project_status}${jsonBody.updated_at}${process.env.BPJS_API_SECRET}`;
    const hmac = crypto.createHmac('sha256', process.env.BPJS_API_SECRET);
    const digest = hmac.update(signatureString).digest('hex');
    const verified = digest === jsonBody.signature;
    console.log(`[BPJS Construction Webhook] BPJS signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[BPJS Construction Webhook] Error during signature verification", error);
    return false;
  }
}

// POST handler for construction status updates - implements full Universal Adapter Contract
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
  if (!isIpAllowed(clientIp, BPJS_ALLOWED_IPS)) {
    console.warn(`[BPJS Construction Webhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  // 3. Read and parse request body
  const body = await request.text();
  try {
    var jsonBody = JSON.parse(body);
  } catch (error) {
    console.error("[BPJS Construction Webhook] Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // 4. Signature verification - ensure request integrity (government API security requirement)
  const signatureValid = await verifyBpjsSignature(body, jsonBody);
  if (!signatureValid) {
    console.error("[BPJS Construction Webhook] Invalid signature - request rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 5. Schema validation - ensure payload matches BPJS API specification
  const validated = BpjsConstructionWebhookPayloadSchema.safeParse(jsonBody);
  if (!validated.success) {
    console.error("[BPJS Construction Webhook] Invalid payload format", validated.error);
    return NextResponse.json({ 
      error: "Invalid payload", 
      details: validated.error.format() 
    }, { status: 400 });
  }

  // 6. Delegate to canonical service handler that preserves Work Continuity
  // This is the same pattern as DJKI/Midtrans: webhook layer only handles security/validation
  // All business logic and state mutations go through the shared connector service
  const result = await handleBpjsWebhookUpdate(validated.data);
  
  if (result.success) {
    console.log(`[BPJS Construction Webhook] Successfully processed BPJS project ${validated.data.project_id}, EOS workId: ${result.workId}`);
    return NextResponse.json({ 
      success: true, 
      workId: result.workId,
      message: "BPJS construction status update processed successfully"
    }, { status: 200 });
  } else {
    console.error(`[BPJS Construction Webhook] Processing failed for BPJS project ${validated.data.project_id}: ${result.error}`);
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

  if (!isIpAllowed(clientIp, BPJS_ALLOWED_IPS)) {
    console.warn(`[BPJS Construction Webhook] Rejected verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  return NextResponse.json({ 
    status: "BPJS Ketenagakerjaan Construction webhook endpoint active - canonical connector-ecosystem implementation",
    api_version: "1.0.0",
    integrated_with: "gov-api-standard composition"
  }, { status: 200 });
}