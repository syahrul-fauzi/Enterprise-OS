import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { readWorkspaceSessionFromRequest } from '@repo/core-kernel/src/session/workspace-session.js';

export async function POST(request: Request) {
  try {
    // Canonical session validation - extract verified workspace/tenant/actor IDs
    const session = readWorkspaceSessionFromRequest(request);
    if (!session?.workspaceId || !session?.tenantId) {
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid or missing workspace session',
        status: 'AUTH_INCONSISTENCY_RESOLVED'
      }, { status: 401 });
    }
    const { workspaceId, tenantId, actorId } = session;
    
    const payload = await request.json();
    // Add canonical context to payload untuk consistency boundary enforcement
    const enrichedPayload = {
      ...payload,
      context: {
        ...payload.context,
        workspaceId,
        tenantId,
        actorId
      }
    };
    
    // Single canonical capability invocation - all governance logic in capability layer
    const { output } = await capabilityRegistry.invoke("governance", "submitDecision", enrichedPayload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Decision submission failed" }, { status: 500 });
  }
}