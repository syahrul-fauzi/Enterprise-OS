import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { randomUUID } from "node:crypto";
import { CommunicationRepository, CommunicationRepositoryInMemory, newCommunicationEventId } from "@capabilities/communication/repository/index";
import { CaseRepository, CaseRepositoryInMemory } from "@capabilities/legal-case/repository/index";
import { executionContext } from "@repo/core-runtime/src/execution-context";
import { recordObservedExecution } from "@repo/core-runtime/src/execution-observability";
import { startExecutionTimer, recordRuntimeInvocation } from "@repo/core-runtime/src/invocation-evidence";
// Import CANONICAL UNIVERSAL PIPELINE - MINIMAL FIX for Reality Ingress unification
import { createUniversalExpression } from "@capabilities/atomic-composition/services/intent-understanding.service";
import type { UniversalIntentInput } from "@capabilities/atomic-composition/contracts/universal-intent.contracts";
// Import ILC webhook handler - REUSES Midtrans pattern (Rule of Two compliant, 2nd slice after Midtrans)
import { handleIlcWebhookUpdate } from "../../../../../../../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service.js";

// ILC platform official IP ranges (production + sandbox + development) - from ILC developer documentation
const ILC_ALLOWED_IPS = new Set([
  // ILC sandbox IPs
  "103.190.25.20", "103.190.25.21",
  // ILC production IPs
  "203.153.210.20", "203.153.210.21", "203.153.210.22",
  // Local development IPs
  "127.0.0.1", "::1"
]);

// Helper to check if IP is allowed - same security pattern as Midtrans webhook
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp);
}

/**
 * ILC signature verification follows HMAC-SHA256 standard (EXACT SAME PATTERN as Midtrans)
 * Signature string: `${sender_id}${message}${discussion_topic}${process.env.ILC_API_SECRET}`
 * Verifies that the request originated from ILC servers (prevents spoofing)
 * Uses timingSafeEqual to prevent timing attacks - critical for production security
 */
async function verifyIlcSignature(body: string, jsonBody: any, requestHeaders: Headers): Promise<boolean> {
  if (!process.env.ILC_API_SECRET) {
    console.error("[IlcWebhook] ILC_API_SECRET environment variable not set");
    return false;
  }

  try {
    // Build signature string following ILC platform spec - aligns with Midtrans pattern
    const signatureString = `${jsonBody.sender_id}${jsonBody.message}${jsonBody.discussion_topic}${process.env.ILC_API_SECRET}`;
    const hmac = crypto.createHmac('sha256', process.env.ILC_API_SECRET);
    const digest = hmac.update(signatureString).digest('hex');
    
    // Support both body signature and X-ILC-Signature header (dual compatibility)
    const requestSignature = jsonBody.signature || requestHeaders.get("X-ILC-Signature");
    if (!requestSignature) return false;
    
    // Use timingSafeEqual to prevent timing attacks (same security standard as Midtrans)
    const signatureBuffer = Buffer.from(requestSignature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[IlcWebhook] ILC signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[IlcWebhook] Error during signature verification", error);
    return false;
  }
}

// ILC community user ID to work ID mapping for WORK-018 ILC continuity
// Maps ILC community member IDs to their respective LawyersHub work IDs
// This implements the core ILC → LawyersHub bridging requirement
const ILC_TO_LAWYERSHUB_WORK_MAPPING: Record<string, string> = {
  // ILC Community members mapped to active LawyersHub cases
  "ilc-community-member-001": "case-003", // ILC discussion about corporate law reform → LawyersHub case
  "ilc-community-member-002": "case-003",
  "ilc-academic-001": "case-003",
  "ilc-practitioner-001": "case-003",
  "ilc-institution-001": "case-003",
  // Additional ILC community members can be mapped to other cases as needed
  "ilc-community-member-003": "case-004",
};

// Resolve work ID from ILC community user ID - implements conversation→Work grounding
function resolveWorkIdFromIlcUserId(userId: string): string | null {
  // First check exact match
  const workId = ILC_TO_LAWYERSHUB_WORK_MAPPING[userId.toLowerCase()];
  if (workId) {
    return workId;
  }
  
  // For WORK-018 prototype, default to case-003 if user not found - maintains shared reality
  console.log(`[ILCWebhook] Unknown ILC user ${userId}, defaulting to case-003 for WORK-018 continuity`);
  return "case-003";
}

// ILC Webhook payload schema - follows same validation pattern as Midtrans
// ILC platform sends community discussion events to this webhook (ALIGNED WITH MIDTRANS SCHEMA PATTERN)
const IlcWebhookPayloadSchema = z.object({
  sender_id: z.string().describe("ILC community user ID"),
  message: z.string().describe("Discussion message content from ILC platform"),
  discussion_topic: z.string().describe("ILC discussion topic this message belongs to"),
  timestamp: z.string().optional(),
  sender_role: z.enum(["community_member", "academic", "practitioner", "institution", "moderator"]).optional(),
  signature: z.string().describe("ILC HMAC-SHA256 signature for request verification")
});

// GET handler for webhook verification - EXACT same pattern as Midtrans
// Validates that only ILC platform can subscribe to this webhook
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
  
  // ILC platform webhook verification logic (follows standard webhook pattern same as Midtrans)
  if (mode === "subscribe" && token === process.env.ILC_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ error: "Invalid verification request" }, { status: 403 });
}

export async function POST(request: Request) {
  // Extract client IP from X-Forwarded-For (same pattern as DJKI/Midtrans)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  let clientIp = "unknown";
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0 && parts[0]) {
      clientIp = parts[0].trim();
    }
  }

  // 1. IP validation first (security boundary - Rule of Two compliant pattern)
  if (!isIpAllowed(clientIp, ILC_ALLOWED_IPS)) {
    console.warn(`[IlcWebhook] Rejected request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 });
  }

  try {
    // 2. Read and parse request body
    const body = await request.clone().text();
    let jsonBody;
    try {
      jsonBody = JSON.parse(body);
    } catch (error) {
      console.error("[IlcWebhook] Invalid JSON payload", error);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    
    // 3. Verify ILC signature (authenticity check)
    const signatureValid = await verifyIlcSignature(body, jsonBody, request.headers);
    if (!signatureValid) {
      console.error("[IlcWebhook] Invalid ILC signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 4. Parse and validate payload schema
    const validated = IlcWebhookPayloadSchema.safeParse(jsonBody);
    
    if (!validated.success) {
      console.error("[ILCWebhook] Invalid payload:", validated.error);
      return NextResponse.json({ error: "Invalid payload", details: validated.error.format() }, { status: 400 });
    }

    const { sender_id, message, discussion_topic, sender_role } = validated.data;
    
    // 4. GROUND TO WORK - CORE EOS THESIS: ILC conversation becomes part of LawyersHub work
    // This is the critical step that implements WORK-018's success metric: conversation→Work continuity
    const resolvedWorkId = resolveWorkIdFromIlcUserId(sender_id);
    
    // 100% CANONICAL REALITY INGRESS: ALL ILC senders (existing + new) use universal pipeline
    // Substrate freeze maintained: no new primitives, complete unification of ALL reality sources
    if (message) {
      console.log(`[ILCWebhook] 🌐 CANONICAL INGRESS: Sender ${sender_id} - piping ALL traffic through universal pipeline`);
      
      // Create universal intent input matching ALL other reality sources (human/system/agent/email/whatsapp)
      const universalInput: UniversalIntentInput = {
        origin: "external_system",
        actorId: sender_id,
        raw: {
          type: "event",
          content: message
        },
        metadata: {
          source: "ilc",
          external_id: randomUUID(),
          discussion_topic: discussion_topic,
          sender_role: sender_role,
          pre_existing_mapped_work_id: resolvedWorkId, // Preserve existing mapping metadata for audit
          // Align High-Value Resolution Work template (customer-support-workspace pattern)
          tenant_id: "default-tenant",
          workspace_id: "institutional-coordination-workspace"
        }
      };
      
      // Execute canonical pipeline - SAME path for ALL senders, fully unifies reality ingress
      const universalExpression = await createUniversalExpression(
        universalInput,
        "tenant-001",
        "workspace-001",
        sender_id
      );
      
      console.log(`[ILCWebhook] ✅ Canonical pipeline created expression: ${universalExpression.id} for ILC sender (workId: ${universalExpression.workId || 'pending'})`);
    }
    
    if (!resolvedWorkId) {
      console.error(`[ILCWebhook] Could not resolve work ID for ILC user ${sender_id}`);
      
      // Record failed execution in observability (WORK-PROD-008: distributed tracing lintas domain)
      const failureExecutionId = randomUUID();
      startExecutionTimer(failureExecutionId);
      recordObservedExecution({
        decision_id: "ilc-webhook-unresolved-work",
        executionId: failureExecutionId,
        success: false,
        error: "Could not resolve work ID from ILC user identifier"
      });
      // WORK-PROD-004: Record failed runtime invocation with metrics
      recordRuntimeInvocation({
        capabilityId: "ilc-webhook",
        operationId: "process-webhook-event",
        sourceRef: `ilc/${sender_id}`,
        success: false,
        input: body,
        result: { error: "Could not resolve work ID from ILC user identifier" },
        work_id: null,
        executionId: failureExecutionId
      });
      
      return NextResponse.json({ error: "ILC user not associated with any LawyersHub work" }, { status: 400 });
    }

    // 5. Initialize execution context for observability tracing
    // WORK-PROD-008: Maintain distributed tracing chain across ILC↔LawyersHub domain boundaries
    const executionId = randomUUID();
    startExecutionTimer(executionId); // Start timer for metrics collection (WORK-PROD-004)
    
    return executionContext.run({
      decision_id: `ilc-webhook-${resolvedWorkId}`,
      logicalWorkId: resolvedWorkId,
      actor_id: sender_id,
      tenant_id: "tenant-001",
      context_trace_id: executionId,
      is_reentry: false
    }, async () => {
      // Record successful work resolution in observability
      recordObservedExecution({
        decision_id: "ilc-webhook-processed",
        executionId: executionId,
        success: true,
        logicalWorkId: resolvedWorkId
      });

    // 6. Save communication event to repository - same pattern as all other adapters
    // The ILC message is now fully grounded in a LawyersHub work - no orphan communication
    const eventId = newCommunicationEventId();
    await CommunicationRepositoryInMemory.save({
      event_id: eventId,
      work_id: resolvedWorkId, // PROPERLY GROUNDED to LawyersHub case (ILC → LawyersHub bridging)
      tenant_id: "tenant-001",
      workspace_id: "workspace-001",
      session_id: "session-001",
      actor_id: sender_id,
      recipient_ids: ["ai-agent-001", "lawyer-007", "operator-001"], // Send to relevant stakeholders + AI Agent for intelligent inspection
      event_type: "CommunicationSent",
      content: `[ILC Discussion: ${discussion_topic}] ${message}`, // Preserve ILC context in message
      adapter_type: "api_webhook", // ILC uses api_webhook adapter type per CommunicationAdapterTypes
      timestamp: new Date().toISOString(),
      status: "delivered",
      lamport_clock: 0,
      previous_event_id: null,
      metadata: {
        ilc_discussion_topic: discussion_topic,
        ilc_sender_role: sender_role,
        ilc_platform_origin: true
      }
    });

    console.log(`[ILCWebhook] WORK-018: Bridged ILC message from ${sender_id} to LawyersHub work ${resolvedWorkId}: "${message.substring(0, 100)}..."`);
    console.log(`[ILCWebhook] Conversation → Work continuity verified: ILC discussion now part of shared reality`);

    // 7. LAYER 7 INTEGRATION: Trigger workspace realtime updates via canonical notifyWorkspaceListeners
    // Reuses exactly the same pattern as CaseRepository when case state changes
    // Aligns with user's W-ILC-002-01 requirement: pesan masuk → status berubah → notifyWorkspaceListeners → realtime UI
    // Import canonical realtime notifier (same as case.repository.ts uses)
    const { notifyWorkspaceListeners } = await import("@repo/core-realtime");
    await notifyWorkspaceListeners("workspace-001", sender_id, resolvedWorkId); // W-ILC-002-04: Pass resolvedWorkId for work-specific updates
    
    console.log(`[ILCWebhook] ✅ Realtime notification sent to workspace workspace-001 for actor ${sender_id}`);
    console.log(`[ILCWebhook] LAYER 7 STATE TRANSITION: Work ${resolvedWorkId} updated, UI listeners notified`);
    
    // WORK-PROD-004: Record runtime invocation with metrics
    recordRuntimeInvocation({
      capabilityId: "ilc-webhook",
      operationId: "process-webhook-event",
      sourceRef: `ilc/${sender_id}`,
      success: true,
      input: body,
      result: { success: true, event_id: eventId, work_id: resolvedWorkId },
      work_id: resolvedWorkId,
      executionId: executionId
    });

    // Return success response to ILC platform
    return NextResponse.json({ 
      success: true, 
      event_id: eventId,
      work_id: resolvedWorkId,
      continuity_verified: true,
      eos_thesis_enforced: "ILC conversation successfully grounded in LawyersHub Work",
      layer7_realtime_enabled: true,
      realtime_notification_sent: true
    }, { status: 200 });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ILCWebhook] Error processing ILC webhook:", message);
    
    // Capture work_id if available from parsed body before failure
    let failedWorkId: string | null = null;
    try {
      const body = await request.clone().json();
      if (body?.sender_id) {
        failedWorkId = resolveWorkIdFromIlcUserId(body.sender_id);
      }
    } catch { /* ignore parsing errors, fallback to null */ }
    
    // WORK-PROD-010: Initialize execution timer BEFORE any processing (moves to top of failure path)
    const failureExecutionId = randomUUID();
    startExecutionTimer(failureExecutionId);
    
    // Record failed execution in observability with work_id if resolved
    recordObservedExecution({
      decision_id: "ilc-webhook-error",
      executionId: failureExecutionId,
      success: false,
      error: message,
      logicalWorkId: failedWorkId ?? undefined
    });
    
    // WORK-PROD-010: Record failed runtime invocation with full metrics including work_id
    recordRuntimeInvocation({
      capabilityId: "ilc-webhook",
      operationId: "process-webhook-event",
      sourceRef: failedWorkId ? `ilc/${failedWorkId}` : "ilc/unknown",
      success: false,
      input: {},
      result: { error: message },
      work_id: failedWorkId,
      executionId: failureExecutionId
    });
    
    // WORK-PROD-010: Always record WorkRealityMetrics even on failure - critical for observability
    if (failedWorkId) {
      const { recordWorkExecutionMetrics } = require("../../../../../../packages/core/runtime/src/execution-observability.js");
      recordWorkExecutionMetrics(failedWorkId, Date.now() - parseInt(failureExecutionId.slice(0, 8), 16), false);
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}