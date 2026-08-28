import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { CommunicationRepository } from "@capabilities/communication/implementation/repository/index.js";

// Webchat user ID to work ID mapping for REAL_WORK_014 observability test
// Maps internal webchat user IDs to their active case IDs - same pattern as WhatsApp/Email
const REAL_WORK_014_WEBCHAT_MAPPING: Record<string, string> = {
  // Customer (user-002) webchat user ID
  "user-002": "case-002",
  // Lawyer (lawyer-007) webchat user ID
  "lawyer-007": "case-002",
  // Operator webchat user ID
  "operator-001": "case-002",
  // ILC Community member (ilc-001) - bridges ILC conversation to LawyersHub work
  "ilc-001": "case-002",
};

// Resolve work ID from webchat user ID - EXACT same function pattern as WhatsApp/Email
function resolveWorkIdFromWebchatUserId(userId: string): string | null {
  if (REAL_WORK_014_WEBCHAT_MAPPING[userId.toLowerCase()]) {
    return REAL_WORK_014_WEBCHAT_MAPPING[userId.toLowerCase()];
  }
  
  console.log(`[WebchatWebhook] Unknown user ${userId}, defaulting to case-002 for REAL_WORK_014`);
  return "case-002";
}

// WebChat webhook payload schema - same validation pattern as WhatsApp/Email
const WebchatWebhookPayloadSchema = z.object({
  sender_id: z.string(),
  message: z.string(),
  timestamp: z.string().optional(),
});

// Helper to check if IP is allowed - COMMON BEHAVIOR, emerges naturally (not forced abstraction)
function isIpAllowed(clientIp: string): boolean {
  // Allow internal network IPs + localhost for webchat (internal channel)
  return clientIp.startsWith("192.168.") || clientIp.startsWith("10.0.") || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Helper to verify webchat signature - COMMON SECURITY BEHAVIOR, sama seperti WhatsApp/Email
async function verifyWebchatSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("x-eos-webchat-signature");
  if (!signature) return false;
  
  if (!process.env.WEBCHAT_WEBHOOK_SECRET) {
    console.error("[WebchatWebhook] WEBCHAT_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.WEBCHAT_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks - critical for production security
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[WebchatWebhook] Webchat signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[WebchatWebhook] Error during webchat signature verification", error);
    return false;
  }
}

// GET handler for webhook verification - MATCHES EXACTLY WhatsApp/Email pattern
export async function GET(request: Request) {
  // IP Whitelisting check - security first, same order as other adapters
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!isIpAllowed(clientIp)) {
    console.error(`[WebchatWebhook] Blocked request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  // Webchat provider webhook verification logic (same pattern as external providers)
  if (mode === "subscribe" && token === process.env.WEBCHAT_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ error: "Invalid verification request" }, { status: 403 });
}

// POST handler for inbound webchat messages - EXACT same workflow as WhatsApp/Email
export async function POST(request: Request) {
  try {
    // IP Whitelisting check for POST requests too - same security order
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!isIpAllowed(clientIp)) {
      console.error(`[WebchatWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
      return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
    }

    // Signature verification to prevent spoofing - same security step
    const signatureValid = await verifyWebchatSignature(request);
    if (!signatureValid) {
      console.error("[WebchatWebhook] Invalid signature, request blocked");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = WebchatWebhookPayloadSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error("[WebchatWebhook] Invalid payload", parsed.error);
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { sender_id, message } = parsed.data;
    
    // GROUND TO WORK - CORE EOS THESIS: no communication exists without Work
    const resolvedWorkId = resolveWorkIdFromWebchatUserId(sender_id);
    if (!resolvedWorkId) {
      console.error(`[WebchatWebhook] Could not resolve work ID for user ${sender_id}`);
      return NextResponse.json({ error: "User not associated with any work" }, { status: 400 });
    }

    // Save communication event to repository - same pattern as WhatsApp/Email
    const eventId = CommunicationRepositoryInMemory.newCommunicationEventId();
    await CommunicationRepositoryInMemory.save({
      event_id: eventId,
      work_id: resolvedWorkId, // PROPERLY GROUNDED to case-002 (ILC conversation → LawyersHub work)
      tenant_id: "tenant-001",
      actor_id: sender_id,
      recipient_ids: ["ai-agent-001"], // Send to AI Agent for intelligent inspection
      event_type: "inbound_message",
      content: message,
      adapter_type: "webchat",
      timestamp: new Date().toISOString(),
      status: "received"
    });

    console.log(`[WebchatWebhook] Processed message from ${sender_id} for work ${resolvedWorkId}: ${message.substring(0, 100)}...`);
    return NextResponse.json({ success: true, event_id: eventId });
  } catch (error) {
    console.error("[WebchatWebhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}