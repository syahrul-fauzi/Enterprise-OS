import { NextRequest, NextResponse } from 'next/server';
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { decodeWorkspaceSession } from "@repo/core-kernel";

// Pure adapter endpoint to receive external government system responses (OSS, Kemenkumham, DJP)
// Follows EOS pure adapter pattern: NO business logic embedded, delegates all to canonical capabilities
export async function POST(request: NextRequest) {
  // 6-boundary compliance: Verify integrations domain can access commsme government domain
  const boundaryValid = validateBoundaryAccess("integration", "commsme");
  if (!boundaryValid) {
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  try {
    // Canonical session validation - use decodeWorkspaceSession for proper actor context
    const session = await decodeWorkspaceSession(request);
    const body = await request.clone().text();
    const jsonBody = JSON.parse(body);

    // Delegate ALL processing to canonical commsme-webhook capability
    const result = await capabilityRegistry.invokeAsync({
      capability: "commsme-webhook",
      command: "process-government-event",
      context: {
        tenantId: session?.tenantId || "",
        workspaceId: session?.workspaceId || "",
        actorId: session?.actorId || `system:gov-webhook:${jsonBody.system || "unknown"}`
      },
      payload: {
        rawBody: body,
        jsonBody: jsonBody,
        headers: Object.fromEntries(request.headers.entries()),
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
      }
    });

    return result.success 
      ? NextResponse.json(result.data) 
      : NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
  } catch (error) {
    console.error("[CommsMeGovWebhook] Failed to process government webhook event", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}