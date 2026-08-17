import { NextResponse } from "next/server";
import {
  capabilityRegistry,
  readWorkspaceSessionFromRequest,
  createAnonymousWorkspaceSession,
} from "@repo/core-kernel";
import type { GetWorkspacesByTenantOutput } from "../../../../../capabilities/identity/implementation/commands/get-workspaces-by-tenant.command.js";
import type { CreateTenantWithSlugResolutionOutput } from "../../../../../capabilities/identity/implementation/commands/create-tenant-with-slug-resolution.command.js";

export async function GET(request: Request) {
  try {
    const session = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();
    const actorId = (session as any).userId ?? session.actorId;

    if (!session.tenantId || !actorId || !session.sessionId) {
      return NextResponse.json({
        ok: false,
        authenticated: false,
        tenant: undefined,
        workspaces: [],
        actorId: session.actorId ?? "",
      }, { status: 200 });
    }

    const { output } = await capabilityRegistry.invokeAsync<GetWorkspacesByTenantOutput>(
      "identity",
      "getWorkspacesByTenant",
      {
        tenantId: session.tenantId,
        actorId,
        sessionId: session.sessionId,
      }
    );

    if (!output) {
      return NextResponse.json({
        ok: false,
        authenticated: true,
        error: "Tenant or workspaces not found",
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      tenant: output.tenant,
      workspaces: output.workspaces,
      actorId: output.actorId,
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tenant";
    return NextResponse.json({
      ok: false,
      authenticated: false,
      error: message,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();
    const actorId = (session as any).userId ?? session.actorId;

    if (!actorId || !session.sessionId) {
      return NextResponse.json({
        ok: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const raw = payload as { readonly name?: string; readonly slug?: string };
    const name = raw.name?.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 422 });
    }

    const { output } = await capabilityRegistry.invokeAsync<CreateTenantWithSlugResolutionOutput>(
      "identity",
      "createTenantWithSlugResolution",
      {
        name,
        suggestedSlug: raw.slug?.trim(),
        ownerId: actorId,
      }
    );

    return NextResponse.json({
      ok: true,
      tenant: {
        id: output.tenantId,
        name: output.name,
        slug: output.slug,
        createdAt: output.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tenant";
    const status = message.includes("slug") || message.includes("name") ? 422 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
