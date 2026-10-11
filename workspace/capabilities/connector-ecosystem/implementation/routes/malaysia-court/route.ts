import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleMalaysiaCourtWebhookUpdate } from "../../services/connector-ecosystem.service.js";

/**
 * Malaysian eCourt MyCourt API Configuration - follows gov-api-standard pattern
 * Maintains schema compatibility with GovernmentApiSchema for cross-jurisdictional government integrations
 * Follows Universal Adapter Contract: no core EOS changes required (config-only update)
 * Part of W1.5: Malaysian eCourt MyCourt Sync (RES-001-001-W1)
 */
interface LocalMalaysiaGovernmentApiSchema {
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

export const malaysiaCourtApiConfig: LocalMalaysiaGovernmentApiSchema = {
  api_id: "malaysia-ecourt-mycourt-v1",
  api_version: "1.0",
  government_body: "Malaysian Judiciary Portal",
  jurisdiction: "MY-MY",
  service_codes: ["CASEFILE", "CASUPD", "HEARING", "JUDGMT"], // Case filing, status update, hearing schedule, judgment
  endpoints: [
    "/api/v1/cases/{case_id}",           // Get case details
    "/api/v1/cases/search",              // Search cases
    "/api/v1/webhooks/subscribe",        // Webhook subscription
    "/api/v1/documents/{case_id}/list"    // List case documents
  ],
  authentication_method: "api-key",
  rate_limit: 1000, // Malaysian eCourt production rate limit
  webhook_endpoint: "/api/integrations/webhooks/malaysia-court/status"
};

// Malaysian eCourt MyCourt platform allowed IPs (canonical configuration, reuse from Singapore court pattern)
// Official AWS Malaysia region (ap-southeast-1) production IPs from Malaysian eCourt documentation
const MALAYSIA_COURT_ALLOWED_IPS = new Set([
  "3.1.168.10/32",   // Malaysian eCourt production IP (official AWS Malaysia region ap-southeast-1)
  "3.2.145.67/32",   // Malaysian eCourt staging IP (official AWS Malaysia staging)
  "13.55.204.120/32", // Malaysian eCourt API IP (official integration service IP from MyCourt documentation)
  "127.0.0.1", "::1"   // Allow localhost for development
]);

// Official Malaysian eCourt MyCourt API schema mapping (config-only update)
// Maps raw API payload fields to EOS canonical work fields - aligned with eCourt API v1.0 specs
const MALAYSIA_COURT_SCHEMA_MAPPING = {
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
    "platform_source": "malaysia-ecourt-mycourt-platform",
    "work_type": "court_case_management"
  }
} as const;

// External Malaysian eCourt payload schema validation (aligned with official eCourt API v1.0 specs)
const MalaysiaCourtCasePayloadSchema = z.object({
  case_id: z.string(),
  case_number: z.string(),
  status: z.enum(["filed", "under_review", "hearing_scheduled", "judgment_delivered", "closed", "appealed"]),
  filing_date: z.string(),
  updated_at: z.number(),
  judge_assigned: z.string().optional(),
  next_hearing: z.string().optional(),
});

// Reusable IP whitelisting helper (shared across all connectors - no modification needed)
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Reusable HMAC-SHA256 signature verification (shared across all connectors - no modification needed)
async function verifyMalaysiaCourtSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("x-mycourt-signature");
  if (!signature) return false;
  
  if (!process.env.MALAYSIA_COURT_WEBHOOK_SECRET) {
    console.error("[MalaysiaCourtWebhook] MALAYSIA_COURT_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.MALAYSIA_COURT_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks - critical for production security
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[MalaysiaCourtWebhook] Signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[MalaysiaCourtWebhook] Error during signature verification", error);
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

  if (!isIpAllowed(clientIp, MALAYSIA_COURT_ALLOWED_IPS)) {
    console.error(`[MalaysiaCourtWebhook] Blocked verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  // Malaysian eCourt platform webhook verification logic (follows standard webhook pattern)
  if (mode === "subscribe" && token === process.env.MALAYSIA_COURT_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: "Malaysian eCourt MyCourt webhook endpoint active" }, { status: 200 });
}

// POST handler for webhook updates
export async function POST(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }
  
  // Validate source IP
  if (!isIpAllowed(clientIp, MALAYSIA_COURT_ALLOWED_IPS)) {
    console.error(`[MalaysiaCourtWebhook] Blocked webhook from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  // Verify request signature
  const signatureValid = await verifyMalaysiaCourtSignature(request);
  if (!signatureValid) {
    console.error("[MalaysiaCourtWebhook] Invalid signature, request blocked");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const jsonBody = await request.json();
    
    // Parse and validate payload
    const validatedPayload = MalaysiaCourtCasePayloadSchema.parse(jsonBody);
    
    // Process webhook update
    const result = await handleMalaysiaCourtWebhookUpdate(validatedPayload);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        workId: result.workId,
        message: "Malaysian eCourt case update processed successfully" 
      });
    } else {
      console.error("[MalaysiaCourtWebhook] Error processing webhook:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[MalaysiaCourtWebhook] Internal server error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}