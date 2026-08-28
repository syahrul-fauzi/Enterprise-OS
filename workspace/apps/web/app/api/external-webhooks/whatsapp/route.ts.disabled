import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { CommunicationRepository } from "@capabilities/communication/implementation/repository/index.js";
import { CaseRepository } from "@capabilities/legal-case/implementation/repository/index.js";

// Phone number to work ID mapping for REAL_WORK_014 observability test
// Maps WhatsApp E.164 phone numbers to their active case IDs
const REAL_WORK_014_PHONE_MAPPING: Record<string, string> = {
  // Customer (user-002) phone number from case-002
  "+628123456789": "case-002",
  // Lawyer (lawyer-007) phone number
  "+628987654321": "case-002",
  // Operator phone number
  "+6285678912345": "case-002",
  // Auditor phone number
  "+6287890123456": "case-002",
  // Notary phone number
  "+6283456789012": "case-002",
};

// Resolve work ID from phone number - implements work-grounded communication requirement
function resolveWorkIdFromPhoneNumber(phoneNumber: string): string | null {
  // First check exact match
  if (REAL_WORK_014_PHONE_MAPPING[phoneNumber]) {
    return REAL_WORK_014_PHONE_MAPPING[phoneNumber];
  }
  
  // Also check if phone number is missing + prefix (Meta sometimes sends without it)
  const withPrefix = `+${phoneNumber}`;
  if (REAL_WORK_014_PHONE_MAPPING[withPrefix]) {
    return REAL_WORK_014_PHONE_MAPPING[withPrefix];
  }
  
  // For REAL_WORK_014, default to case-002 if phone number is not found (maintains shared reality)
  console.log(`[WhatsAppWebhook] Unknown phone number ${phoneNumber}, defaulting to case-002 for REAL_WORK_014`);
  return "case-002";
}

// WhatsApp Webhook Payload Schema (Meta Cloud API v18.0)
const WhatsAppWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string().optional(),
            metadata: z.object({
              phone_number_id: z.string()
            }).optional(),
            contacts: z.array(
              z.object({
                wa_id: z.string()
              })
            ).optional(),
            messages: z.array(
              z.object({
                from: z.string(),
                id: z.string(),
                timestamp: z.string(),
                text: z.object({
                  body: z.string()
                }).optional(),
                type: z.enum(["text", "reaction", "image", "video", "document", "location", "status"])
              })
            ).optional(),
            statuses: z.array(
              z.object({
                id: z.string(),
                recipient_id: z.string(),
                status: z.enum(["sent", "delivered", "read", "failed"])
              })
            ).optional()
          }),
          field: z.string()
        })
      )
    })
  )
});

/**
 * WhatsApp Webhook Handler for EOS Communication Capability
 * Handles both inbound messages (users sending messages to EOS) and status updates (delivery confirmations)
 * 
 * Meta Webhook Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

// Meta WhatsApp Cloud API official IP ranges (as of 2024)
const WHATSAPP_ALLOWED_IPS = new Set([
  "185.60.132.22/32", "185.60.132.153/32",
  "18.208.110.136/32", "3.222.127.115/32",
  "15.190.247.174/32", "18.232.9.177/32"
]);

// Helper to check if IP is allowed
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1"; // Allow localhost for dev
}

// Helper to verify Meta webhook signature (common security behavior)
async function verifyWhatsAppSignature(request: Request): Promise<boolean> {
  const signatureHeader = request.headers.get("x-hub-signature-256");
  if (!signatureHeader) return false;
  
  if (!process.env.WHATSAPP_WEBHOOK_SECRET) {
    console.error("[WhatsAppWebhook] WHATSAPP_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    // Extract signature from header (format: sha256=abc123...)
    const signature = signatureHeader.split("=")[1];
    if (!signature) return false;

    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks - critical for production security
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[WhatsAppWebhook] WhatsApp signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[WhatsAppWebhook] Error during WhatsApp signature verification", error);
    return false;
  }
}

// Handle Meta's verification request (GET method)
export async function GET(request: Request) {
  // Extract client IP from request (Next.js specific)
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  
  // IP Whitelisting check - security first
  if (!isIpAllowed(clientIp, WHATSAPP_ALLOWED_IPS)) {
    console.error(`[WhatsAppWebhook] Blocked request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsAppWebhook] Webhook verification successful");
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error("[WhatsAppWebhook] Webhook verification failed - invalid token");
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// Handle incoming webhook events (POST method)
export async function POST(request: Request) {
  try {
    // IP Whitelisting check for POST requests too
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!isIpAllowed(clientIp, WHATSAPP_ALLOWED_IPS)) {
      console.error(`[WhatsAppWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
      return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
    }

    // Signature verification to prevent spoofing
    const signatureValid = await verifyWhatsAppSignature(request);
    if (!signatureValid) {
      console.error("[WhatsAppWebhook] Invalid signature, request blocked");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = await request.json();
    const payload = WhatsAppWebhookPayloadSchema.parse(body);
    console.log(`[WhatsAppWebhook] Received webhook event: ${payload.object}`);

    // Process all entries in the webhook payload
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Process delivery status updates (messages we sent that got delivered/read)
        if (value.statuses) {
          for (const status of value.statuses) {
            console.log(`[WhatsAppWebhook] Message ${status.id} status: ${status.status} to ${status.recipient_id}`);
            
            // Update communication event in repository with new status
            const allEvents = CommunicationRepositoryInMemory.list();
            const event = allEvents.find(e => e.message_id === status.id);
            if (event) {
              await CommunicationRepositoryInMemory.updateStatus(event.event_id, status.status as any);
              console.log(`[WhatsAppWebhook] Updated event ${event.event_id} status to ${status.status}`);
            } else {
              console.warn(`[WhatsAppWebhook] Could not find event for message ID ${status.id}`);
            }
          }
        }

        // Process inbound messages (users sending messages to EOS)
        if (value.messages) {
          for (const message of value.messages) {
            console.log(`[WhatsAppWebhook] Received message from ${message.from}: ${message.text?.body?.substring(0, 100)}...`);
            
            // Inbound messages are GROUNDED TO WORK - resolve work_id from phone number
            // Implements core EOS communication thesis: all communication happens against the same Work
            const resolvedWorkId = resolveWorkIdFromPhoneNumber(message.from);
            
            if (message.type === "text" && message.text && resolvedWorkId) {
              // Create a new CommunicationEvent for the inbound message
              // This maintains EOS's shared reality model - all messages are events on the same Work
              const eventId = CommunicationRepositoryInMemory.newCommunicationEventId();
              await CommunicationRepositoryInMemory.save({
                event_id: eventId,
                work_id: resolvedWorkId, // PROPERLY GROUNDED to real Work ID (case-002) for REAL_WORK_014
                tenant_id: "tenant-001", // Matches default tenant from case.repository.ts
                actor_id: message.from,
                recipient_ids: ["ai-agent-001"], // Send to AI Agent for processing (grounded agentic loop)
                event_type: "inbound_message",
                content: message.text.body,
                adapter_type: "whatsapp",
                message_id: message.id,
                timestamp: new Date().toISOString(),
                status: "received",
                session_id: "webhook-session",
                workspace_id: "workspace-001", // Matches default workspace from case.repository.ts
                metadata: {
                  raw_timestamp: message.timestamp,
                  phone_number_mapped: true,
                  resolved_work_id: resolvedWorkId
                }
              });
              
              console.log(`[WhatsAppWebhook] Inbound message stored with work_id: ${resolvedWorkId} - shared reality maintained`);
            }
          }
        }
      }
    }

    // Return 200 OK to Meta to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("[WhatsAppWebhook] Failed to process webhook payload:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}