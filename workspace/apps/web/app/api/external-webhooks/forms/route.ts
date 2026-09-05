import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { 
  createAnonymousWorkspaceSession, 
  encodeWorkspaceSession, 
  decodeWorkspaceSession 
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { canonicalWorkStore, workspaceWorkIndex, notifyWorkspaceListeners } from "../../work/create/route.js";

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

// Official Tally webhook IP ranges (as of 2024)
const FORMS_ALLOWED_IPS = new Set([
  "3.121.129.158/32", "18.159.134.223/32", // Tally official IPs
  "3.236.255.27/32", "18.210.237.19/32",    // Typeform official IPs
]);

// Helper to check if IP is allowed
function isIpAllowed(clientIp: string, allowedIps: Set<string>): boolean {
  return allowedIps.has(clientIp) || clientIp === "::1" || clientIp === "127.0.0.1";
}

// Verify Tally/Typeform webhook signature
async function verifyFormSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("tally-signature") || request.headers.get("typeform-signature");
  if (!signature) return false;
  
  if (!process.env.EXTERNAL_FORMS_WEBHOOK_SECRET) {
    console.error("[FormsWebhook] EXTERNAL_FORMS_WEBHOOK_SECRET environment variable not set");
    return false;
  }

  try {
    const body = await request.clone().text();
    const hmac = crypto.createHmac('sha256', process.env.EXTERNAL_FORMS_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    const verified = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    console.log(`[FormsWebhook] Form signature verification ${verified ? "passed" : "failed"}`);
    return verified;
  } catch (error) {
    console.error("[FormsWebhook] Error during signature verification", error);
    return false;
  }
}

// Extract form answers into plain key-value object
function extractFormAnswers(answers: z.infer<typeof ExternalFormPayloadSchema.shape.answers>) {
  const extracted: Record<string, any> = {};
  for (const answer of answers) {
    extracted[answer.key] = answer.value;
  }
  return extracted;
}

// GET handler for webhook verification (supports no-code platform verification requests)
export async function GET(request: Request) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!isIpAllowed(clientIp, FORMS_ALLOWED_IPS)) {
    console.error(`[FormsWebhook] Blocked GET request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const token = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  
  if (mode === "subscribe" && token === process.env.EXTERNAL_FORMS_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ error: "Invalid verification request" }, { status: 403 });
}

// POST handler for inbound form submissions - core S.ID-EXT-001 implementation
export async function POST(request: Request) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!isIpAllowed(clientIp, FORMS_ALLOWED_IPS)) {
    console.error(`[FormsWebhook] Blocked POST request from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized source IP" }, { status: 403 });
  }

  const signatureValid = await verifyFormSignature(request);
  if (!signatureValid) {
    console.error("[FormsWebhook] Invalid signature, request blocked");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = ExternalFormPayloadSchema.safeParse(body);
    
    if (!validated.success) {
      console.error("[FormsWebhook] Invalid payload:", validated.error);
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { form_id, response_id, created_at, answers } = validated.data;
    const formData = extractFormAnswers(answers);
    
    // Create anonymous session for external form submitter (no EOS account required)
    const anonymousSession = createAnonymousWorkspaceSession();
    const encodedSession = encodeWorkspaceSession(anonymousSession);
    const session = decodeWorkspaceSession(encodedSession.split("=")[1]);
    
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
      return NextResponse.json({ error: "Failed to create session for external user" }, { status: 500 });
    }

    // Compose work title and description from form data
    const companyName = formData.company_name || "Unknown Organization";
    const contactName = formData.contact_name || "Unknown Contact";
    const problemDescription = formData.problem_description || "No problem description provided";
    const contactEmail = formData.contact_email || "no-email@example.com";
    
    const title = `Security Assessment Request: ${companyName}`;
    const description = `Contact: ${contactName} (${contactEmail})\n\nProblem: ${problemDescription}\n\nForm ID: ${form_id}, Response ID: ${response_id}`;

    // Invoke canonical work creation - REUSES EXACT SAME logic as native EOS work creation
    let workId: string;
    try {
      const result = await capabilityRegistry.invokeAsync("work-core", "work.create", {
        title,
        description,
        domain: "services", // Maps to service-request domain type
        domainSpecificData: {
          ...formData,
          source: "EXTERNAL_FORM",
          form_id,
          response_id,
          external_contact_email: contactEmail,
          external_contact_name: contactName
        },
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }) as { output: { workId: string; domainType: string; id: string } };
      workId = result.output.workId;
    } catch (registryError) {
      // Fallback to in-memory creation if capability registry unavailable - same as /api/work/create
      if (
        registryError instanceof Error &&
        (registryError.message.includes("Command not found") ||
          registryError.message.includes("capability-registry"))
      ) {
        console.log(`[FormsWebhook] capabilityRegistry unavailable - using in-memory fallback. Reason: ${registryError.message.split("\n")[0]}`);
        workId = `w-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      } else {
        throw registryError;
      }
    }

    // Save canonical work record with platformSource = EXTERNAL (fulfills E6 acceptance criteria)
    const record = {
      workId,
      id: workId,
      title,
      description,
      domainType: "service-request",
      specialization: "Service Request",
      status: "new",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      platformSource: "EXTERNAL_FORM",
      platformMetadata: {
        form_id,
        response_id,
        external_email: contactEmail,
        external_name: contactName
      },
      evidence: [{
        type: "external_form_submission",
        title: `Form submission from ${contactName} at ${companyName}`,
        content: JSON.stringify(formData)
      }],
      participants: [{
        id: session.actorId,
        name: contactName,
        role: "Requester",
        actorType: "external-human"
      }],
    };

    canonicalWorkStore.set(workId, record);
    const wsIndex = workspaceWorkIndex.get(session.workspaceId) ?? [];
    wsIndex.push(workId);
    workspaceWorkIndex.set(session.workspaceId, wsIndex);
    
    // Trigger realtime updates for all connected EOS operators
    notifyWorkspaceListeners(session.workspaceId);

    console.log(`[FormsWebhook] ✅ S.ID-EXT-001: External form submission converted to canonical EOS work: ${workId} (source: EXTERNAL_FORM)`);
    console.log(`[FormsWebhook] Work created for external user: ${contactName} at ${companyName}, email: ${contactEmail}`);
    
    return NextResponse.json({
      success: true,
      workId,
      message: "External form submission converted to canonical EOS work successfully"
    }, { status: 201 });

  } catch (error) {
    console.error("[FormsWebhook] Failed to process form submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}