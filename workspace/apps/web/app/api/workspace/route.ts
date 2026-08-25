import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import {
  readWorkspaceSessionFromRequest,
  createAnonymousWorkspaceSession,
} from "@repo/core-kernel";
import type { CreateWorkspaceFlowOutput } from "identity/implementation/commands/create-workspace-flow.command.js";

export async function GET(request: Request) {
  try {
    const session = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();
    const actorId = (session as any).userId ?? session.actorId;

    if (!session.workspaceId || !actorId || !session.sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { output } = await capabilityRegistry.invokeAsync(
      "identity",
      "getWorkspaceById",
      {
        workspaceId: session.workspaceId,
        actorId,
        sessionId: session.sessionId,
      }
    );

    if (!output) {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workspace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();
    const actorId = (session as any).userId ?? session.actorId;

    if (!actorId || !session.sessionId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const raw = payload as { readonly name?: string; readonly productId?: string };
    const name = raw.name?.trim();
    const productId = raw.productId?.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 422 });
    }
    if (!productId) {
      return NextResponse.json({ ok: false, error: "productId is required" }, { status: 422 });
    }

    if (!session.tenantId) {
      return NextResponse.json({ ok: false, error: "No active tenant - create organization first" }, { status: 422 });
    }

    const { output } = await capabilityRegistry.invokeAsync<CreateWorkspaceFlowOutput>(
      "identity",
      "createWorkspaceFlow",
      {
        name,
        productId,
        tenantId: session.tenantId,
        actorId,
      }
    );

    return NextResponse.json({
      ok: true,
      workspace: output.workspace,
      membership: output.membership,
    }, { status: 201 });
  } catch (error) {
    console.error("[API /api/workspace POST] ERROR STACK:", error);
    const message = error instanceof Error ? error.message : "Failed to create workspace";
    const status = message.includes("required") || message.includes("Tenant not found") ? 422 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}