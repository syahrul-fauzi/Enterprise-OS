import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleEmailWebhookUpdate } from "../../services/connector-ecosystem.service";

// Email platform allowed IPs (canonical configuration, reuse from legacy)
const EMAIL_ALLOWED_IPS = new Set([
  "13.229.100.15/32", // Email platform production IP
  "3.1.145.223/32",   // Email platform staging IP
  "127.0.0.1", "::1"  // Allow localhost for development
]);

// External Email payload schema validation
const ExternalEmailPayloadSchema = z.object({
  message_id: z.string(),
  thread_id: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  received_at: z.string(),
  text: z.string(),
  status: z.enum(["received", "archived", "deleted"]).optional(),
});

// Helper to check if IP is allowed - follows same security pattern as all other connectors
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Verify Email webhook signature - reused from legacy implementation
async function verifyEmailSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("x-twilio-email-event-signature");
  if (!signature) return false;
  
  if (!process.env.EMAIL_WEBHOOK_SECRET) {
    console.error("[EmailWebhook] EMAIL_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.EMAIL_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks - critical for production security
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[EmailWebhook] Email signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[EmailWebhook] Error during email signature verification", error);
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

  if (!isIpAllowed(clientIp, EMAIL_ALLOWED_IPS)) {
    console.error(`[EmailWebhook] Blocked verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }
  
  return NextResponse.json({ status: "Email webhook endpoint active" }, { status: 200 });
}

// POST handler for incoming email webhooks
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
  if (!isIpAllowed(clientIp, EMAIL_ALLOWED_IPS)) {
    console.error(`[EmailWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  // Signature verification (canonical security pattern)
  const signatureValid = await verifyEmailSignature(request);
  if (!signatureValid) {
    console.error("[EmailWebhook] Invalid signature, request blocked");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const jsonBody = await request.json();
    
    // Payload validation before processing
    const validatedBody = ExternalEmailPayloadSchema.parse(jsonBody);
    const result = await handleEmailWebhookUpdate(validatedBody);

    if (result.success) {
      return NextResponse.json({ status: "processed", workId: result.workId }, { status: 200 });
    } else {
      console.error("[EmailWebhook] Error processing webhook:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[EmailWebhook] Internal server error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}