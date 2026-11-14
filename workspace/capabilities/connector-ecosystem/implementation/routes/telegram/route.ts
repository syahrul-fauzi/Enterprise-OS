// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { handleTelegramWebhookUpdate } from "../../services/connector-ecosystem.service.js";

// Telegram Webhook Payload Schema (Telegram Bot API v7.0) - reused from Universal Adapter Contract pattern
const TelegramWebhookPayloadSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      first_name: z.string(),
      username: z.string().optional(),
      language_code: z.string().optional()
    }),
    chat: z.object({
      id: z.number(),
      type: z.string()
    }),
    date: z.number(),
    text: z.string().optional()
  }).optional()
});

// Telegram IP whitelist for webhooks - only allow official Telegram IP ranges (per Telegram docs)
const isTelegramIP = (ip: string): boolean => {
  const telegramIPRanges = ["149.154.160.0/21", "91.108.4.0/22"];
  return telegramIPRanges.some(range => {
    const rangeParts = range.split('/');
    if (!rangeParts[0]) return false;
    const baseIP = rangeParts[0].split('.').slice(0,3).join('.');
    return ip.startsWith(baseIP);
  });
};

// Verify Telegram webhook signature to ensure request authenticity
const verifyTelegramSecret = (signature: string, body: string, appSecret: string): boolean => {
  // Telegram uses X-Telegram-Bot-Api-Secret-Token header for verification
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(appSecret));
};

// GET handler for health check endpoint (per manifest requirement)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  
  // Health check endpoint
  if (mode === 'health') {
    // Verify all required environment variables are present
    const requiredEnvVars = [
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_WEBHOOK_SECRET',
      'TELEGRAM_APP_SECRET',
      'TELEGRAM_WEBHOOK_VERIFY_TOKEN'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length === 0) {
      return NextResponse.json({
        status: 'healthy',
        message: 'Telegram channel adapter is running and configured correctly',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Missing required environment variables',
        missing_env_vars: missingEnvVars,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
  
  // Webhook verification endpoint (for Telegram Bot API setup)
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  if (token === process.env.TELEGRAM_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  
  return new Response('Forbidden', { status: 403 });
}

// POST handler for Telegram webhook events
export async function POST(request: Request) {
  try {
    // Get client IP for IP whitelisting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '';
    if (!isTelegramIP(clientIP)) {
      return NextResponse.json({ error: 'Unauthorized IP' }, { status: 401 });
    }

    // Verify request signature
    const signature = request.headers.get('x-telegram-bot-api-secret-token');
    const body = await request.text();
    const appSecret = process.env.TELEGRAM_APP_SECRET;
    
    if (!signature || !appSecret || !verifyTelegramSecret(signature, body, appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Parse and validate payload with Zod
    const payload = JSON.parse(body);
    const validatedPayload = TelegramWebhookPayloadSchema.parse(payload);
    
    // Process the webhook update using our service handler
    const result = await handleTelegramWebhookUpdate(validatedPayload);
    
    if (result.success) {
      return NextResponse.json({ success: true, workId: result.workId }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[Telegram Webhook] Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}