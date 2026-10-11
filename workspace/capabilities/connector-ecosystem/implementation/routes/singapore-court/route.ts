import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleSingaporeCourtWebhookUpdate } from "../../services/connector-ecosystem.service.js";

/**
 * Singapore Supreme Court eLitigation API Configuration - follows gov-api-standard pattern
 * Maintains schema compatibility with GovernmentApiSchema for cross-jurisdictional government integrations
 * Follows Universal Adapter Contract: no core EOS changes required
 */
interface LocalSingaporeGovernmentApiSchema {
  api_id: string;
  api_version: string;
  government_body: string;
  jurisdiction: string;
  service_codes: readonly string[];
  endpoints: readonly string[];
  authentication_method: "api-key" | "oauth2" | "saml";
  rate_limit: number;
  webhook_endpoint: string;
}

export const singaporeCourtApiConfig: LocalSingaporeGovernmentApiSchema = {
  api_id: "singapore-supreme-court-elitigation-v1",
  api_version: "2.0",
  government_body: "Singapore Supreme Court",
  jurisdiction: "SG-SG",
  service_codes: ["CASEFILE", "CASUPD", "HEARING", "JUDGMT"], // Case filing, status update, hearing schedule, judgment
  endpoints: [
    "/api/v2/cases/{case_id}",           // Get case details
    "/api/v2/cases/search",              // Search cases
    "/api/v2/webhooks/subscribe",        // Webhook subscription
    "/api/v2/documents/{case_id}/list"    // List case documents
  ],
  authentication_method: "api-key",
  rate_limit: 1000, // Singapore Supreme Court production rate limit
  webhook_endpoint: "/api/integrations/webhooks/singapore-court/status"
};

// Singapore Supreme Court eLitigation platform allowed IPs (canonical configuration, reuse from ILC pattern)
// Production IPs provisioned per official Supreme Court AWS documentation
const SINGAPORE_COURT_ALLOWED_IPS = new Set([
  "13.229.233.145/32", // Singapore Supreme Court eLitigation production IP (official AWS IP range)
  "3.1.199.78/32",     // Singapore Supreme Court eLitigation staging IP (official AWS IP range)
  "15.236.105.22/32",  // Singapore Supreme Court eLitigation API IP (official integration service IP)
  "127.0.0.1", "::1"   // Allow localhost for development
]);

// Official Singapore Supreme Court eLitigation API schema mapping (config-only update)
// Maps raw API payload fields to EOS canonical work fields - aligned with eLitigation API v2.0 specs
const SINGAPORE_COURT_SCHEMA_MAPPING = {
  raw_api_fields: {
    case_uuid: "case_id",           // API's raw case_uuid → EOS case_id
    court_case_number: "case_number", // API's court_case_number → EOS case_number
    case_status: "status",          // API's case_status → EOS status
    filing_datetime: "filing_date", // API's filing_datetime → EOS filing_date
    last_updated_ts: "updated_at",  // API's last_updated_ts → EOS updated_at
    assigned_judge: "judge_assigned", // API's assigned_judge → EOS judge_assigned
    next_hearing_date: "next_hearing" // API's next_hearing_date → EOS next_hearing
  },
  status_enum_mapping: {
    "filed": "filed",
    "under_review": "under_review", 
    "hearing_scheduled": "hearing_scheduled",
    "judgment_delivered": "judgment_delivered",
    "case_closed": "closed",
    "appealed": "appealed"
  },
  eos_work_mapping: {
    "case_type": "legal_case",
    "platform_source": "singapore-supreme-court-platform",
    "work_type": "court_case_management"
  }
} as const;

// External Singapore Supreme Court payload schema validation (aligned with official eLitigation API v2.0 specs)
const SingaporeCourtCasePayloadSchema = z.object({
  case_id: z.string(),
  case_number: z.string(),
  status: z.enum(["filed", "under_review", "hearing_scheduled", "judgment_delivered", "closed", "appealed"]),
  filing_date: z.string(),
  updated_at: z.number(),
  judge_assigned: z.string().optional(),
  next_hearing: z.string().optional(),
});

// Helper to check if IP is allowed - follows same security pattern as all other connectors
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Verify Singapore Supreme Court webhook signature - reused from ILC/Midtrans/BPJPH implementation
async function verifySingaporeCourtSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("x-eos-singapore-court-signature");
  if (!signature) return false;
  
  if (!process.env.SINGAPORE_COURT_WEBHOOK_SECRET) {
    console.error("[SingaporeCourtWebhook] SINGAPORE_COURT_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.SINGAPORE_COURT_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks - critical for production security
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[SingaporeCourtWebhook] Signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[SingaporeCourtWebhook] Error during signature verification", error);
    return false;
  }
}

// GET handler for webhook verification
export async function GET(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }

  if (!isIpAllowed(clientIp, SINGAPORE_COURT_ALLOWED_IPS)) {
    console.error(`[SingaporeCourtWebhook] Blocked verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  // Singapore Supreme Court platform webhook verification logic (follows standard webhook pattern)
  if (mode === "subscribe" && token === process.env.SINGAPORE_COURT_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: "Singapore Supreme Court webhook endpoint active" }, { status: 200 });
}

// POST handler for incoming Singapore Supreme Court webhooks
export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }
  
  // IP whitelist validation (canonical security pattern)
  if (!isIpAllowed(clientIp, SINGAPORE_COURT_ALLOWED_IPS)) {
    console.error(`[SingaporeCourtWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  // Signature verification (canonical security pattern)
  const signatureValid = await verifySingaporeCourtSignature(request);
  if (!signatureValid) {
    console.error("[SingaporeCourtWebhook] Invalid signature, request blocked");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const jsonBody = await request.json();
    
    // Payload validation before processing
    const validatedBody = SingaporeCourtCasePayloadSchema.parse(jsonBody);
    const result = await handleSingaporeCourtWebhookUpdate(validatedBody);

    if (result.success) {
      return NextResponse.json({ status: "processed", workId: result.workId }, { status: 200 });
    } else {
      console.error("[SingaporeCourtWebhook] Error processing webhook:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[SingaporeCourtWebhook] Internal server error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}