import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleILCWebhookUpdate } from "../../services/connector-ecosystem.service";

// ILC platform allowed IPs (canonical configuration, reuse from legacy)
const ILC_ALLOWED_IPS = new Set([
  "13.229.100.15/32", // ILC platform production IP
  "3.1.145.223/32",   // ILC platform staging IP
  "15.236.120.88/32", // ILC platform API IP
  "127.0.0.1", "::1"  // Allow localhost for development
]);

// External ILC payload schema validation
const ExternalILCPayloadSchema = z.object({
  tracking_number: z.string(),
  order_id: z.string(),
  status: z.enum(["created", "shipped", "in_transit", "out_for_delivery", "delivered", "returned", "cancelled"]),
  location: z.string(),
  updated_at: z.number(),
  estimated_delivery: z.string().optional(),
});

// Helper to check if IP is allowed - follows same security pattern as all other connectors
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Verify ILC webhook signature - reused from legacy implementation
async function verifyIlcSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("x-eos-ilc-signature");
  if (!signature) return false;
  
  if (!process.env.ILC_WEBHOOK_SECRET) {
    console.error("[ILCWebhook] ILC_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.ILC_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks - critical for production security
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[ILCWebhook] ILC signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[ILCWebhook] Error during signature verification", error);
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

  if (!isIpAllowed(clientIp, ILC_ALLOWED_IPS)) {
    console.error(`[ILCWebhook] Blocked verification request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  // ILC platform webhook verification logic (follows standard webhook pattern)
  if (mode === "subscribe" && token === process.env.ILC_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: "ILC webhook endpoint active" }, { status: 200 });
}

// POST handler for incoming ILC webhooks
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
  if (!isIpAllowed(clientIp, ILC_ALLOWED_IPS)) {
    console.error(`[ILCWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  // Signature verification (canonical security pattern)
  const signatureValid = await verifyIlcSignature(request);
  if (!signatureValid) {
    console.error("[ILCWebhook] Invalid signature, request blocked");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const jsonBody = await request.json();
    
    // Payload validation before processing
    const validatedBody = ExternalILCPayloadSchema.parse(jsonBody);
    const result = await handleILCWebhookUpdate(validatedBody);

    if (result.success) {
      return NextResponse.json({ status: "processed", workId: result.workId }, { status: 200 });
    } else {
      console.error("[ILCWebhook] Error processing webhook:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[ILCWebhook] Internal server error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}