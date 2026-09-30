import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleWhatsAppWebhookUpdate } from "../../services/connector-ecosystem.service.js";

// WhatsApp Webhook Payload Schema (Meta Cloud API v18.0) - reused from legacy implementation
const WhatsAppWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messages: z.array(
              z.object({
                from: z.string(),
                id: z.string(),
                timestamp: z.string(),
                text: z.object({
                  body: z.string()
                }).optional()
              })
            ).optional()
          })
        })
      )
    })
  )
});

// Meta IP whitelist for WhatsApp webhooks - only allow Meta IP ranges
const isMetaIP = (ip: string): boolean => {
  const metaIPRanges = ["185.199.108.0/22", "157.240.0.0/15"];
  return metaIPRanges.some(range => {
    // Extract base IP secara aman dengan fallback jika split gagal (tidak akan pernah terjadi karena hardcode)
    const rangeParts = range.split('/');
    if (!rangeParts[0]) return false;
    const baseIP = rangeParts[0].split('.').slice(0,3).join('.');
    return ip.startsWith(baseIP);
  });
};

// Verify Meta webhook signature to ensure request authenticity
const verifyMetaSignature = (signature: string, body: string, appSecret: string): boolean => {
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

// GET handler for Meta webhook verification challenge
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify webhook with Meta's verification requirements
  // Null check untuk menghindari Object is possibly 'undefined' error (linter TS2532)
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// POST handler for WhatsApp webhook events
export async function POST(request: Request) {
  try {
    // Get client IP for IP whitelisting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '';
    if (!isMetaIP(clientIP)) {
      return NextResponse.json({ error: 'Unauthorized IP' }, { status: 401 });
    }

    // Verify request signature
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    
    if (!signature || !appSecret || !verifyMetaSignature(signature, body, appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Parse and validate payload with Zod
    const payload = JSON.parse(body);
    const validatedPayload = WhatsAppWebhookPayloadSchema.parse(payload);
    
    // Process the webhook update using our service handler
    const result = await handleWhatsAppWebhookUpdate(validatedPayload);
    
    if (result.success) {
      return NextResponse.json({ success: true, workId: result.workId }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}