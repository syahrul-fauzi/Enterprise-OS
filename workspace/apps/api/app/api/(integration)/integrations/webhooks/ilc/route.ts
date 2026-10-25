import { NextRequest, NextResponse } from 'next/server';
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts";
import { capabilityRegistry } from "@repo/core-kernel/src/registry/capability-command-registry";

// GET handler for webhook verification - maintains ILC platform compatibility
export async function GET(request: Request) {
  // Boundary validation: integration → ilc domain is allowed
  const boundaryValid = validateBoundaryAccess("integration", "ilc");
  if (!boundaryValid) {
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  // Delegate verification to canonical capability
  const result = await capabilityRegistry.invokeAsync({
    capability: "ilc-webhook",
    command: "verify-subscription",
    context: {},
    payload: {
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    }
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode || 403 });
  }

  return new NextResponse(result.data.challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  // Boundary validation: integration → ilc domain is allowed
  const boundaryValid = validateBoundaryAccess("integration", "ilc");
  if (!boundaryValid) {
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  try {
    // Read raw request body for signature verification (delegated to capability)
    const body = await request.clone().text();
    const jsonBody = JSON.parse(body);

    // Delegate ALL webhook processing to canonical ILC capability
    const result = await capabilityRegistry.invokeAsync({
      capability: "ilc-webhook",
      command: "process-event",
      context: {
        tenantId: "tenant-001",
        workspaceId: "workspace-001",
        actorId: jsonBody.sender_id || "system-ilc-webhook"
      },
      payload: {
        rawBody: body,
        jsonBody: jsonBody,
        headers: Object.fromEntries(request.headers.entries()),
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
      }
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[ILCWebhook] Failed to process webhook event", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}