import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleFormsWebhookUpdate } from "../../services/connector-ecosystem.service.js";

// Tally/Typeform webhook payload schema (matches no-code form standard)
const ExternalFormPayloadSchema = z.object({
  event_type: z.string().optional(),
  form_id: z.string(),
  response_id: z.string(),
  created_at: z.string(),
  answers: z.array(
    z.object({
      key: z.string(),
      value: z.any(),
      type: z.string().optional()
    })
  )
});

// Official Tally/Typeform IP ranges (production)
const FORMS_ALLOWED_IPS = new Set([
  "3.121.129.158/32", "18.159.134.223/32", // Tally official IPs
  "3.236.255.27/32", "18.210.237.19/32",    // Typeform official IPs
  "127.0.0.1", "::1" // Allow localhost for development
]);

// Helper to check if IP is allowed - follows canonical connector pattern
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Verify webhook signature - follows canonical connector signature pattern
async function verifyFormsSignature(request: Request): Promise<boolean> {
  const signatureHeader = request.headers.get("tally-signature") || request.headers.get("typeform-signature");
  if (!signatureHeader) return false;
  
  if (!process.env.EXTERNAL_FORMS_WEBHOOK_SECRET) {
    console.error("[FormsWebhook] EXTERNAL_FORMS_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.EXTERNAL_FORMS_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    const signatureBuffer = Buffer.from(signatureHeader);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
  } catch (error) {
    console.error("[FormsWebhook] Error during signature verification", error);
    return false;
  }
}

// Extract form answers into plain key-value object - reused from legacy implementation
function extractFormAnswers(answers: z.infer<typeof ExternalFormPayloadSchema.shape.answers>) {
  const extracted: Record<string, any> = {};
  for (const answer of answers) {
    extracted[answer.key] = answer.value;
  }
  return extracted;
}

// GET handler for webhook verification - follows canonical connector pattern
export async function GET(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
  if (!isIpAllowed(clientIp, FORMS_ALLOWED_IPS)) {
    console.error(`[FormsWebhook] Blocked GET request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  // Guard clause untuk memastikan semua parameter yang dibutuhkan ada
  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: "Missing required verification parameters" }, { status: 400 });
  }

  if (mode === "subscribe" && token === process.env.EXTERNAL_FORMS_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ error: "Invalid verification request" }, { status: 403 });
}

// POST handler for inbound form submissions - delegates to canonical service handler
export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
  if (!isIpAllowed(clientIp, FORMS_ALLOWED_IPS)) {
    console.error(`[FormsWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const signatureValid = await verifyFormsSignature(request);
  if (!signatureValid) {
    console.error("[FormsWebhook] Invalid signature, request blocked");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const jsonBody = await request.json();
    const result = await handleFormsWebhookUpdate(jsonBody);

    if (result.success) {
      return NextResponse.json({ status: "processed", workId: result.workId }, { status: 200 });
    } else {
      console.error("[FormsWebhook] Error processing webhook:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[FormsWebhook] Internal server error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}