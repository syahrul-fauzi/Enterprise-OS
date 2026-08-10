import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readWorkspaceSessionFromRequest,
  isAuthenticatedSession,
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  capabilityRegistry,
} from "@repo/core-kernel";
import {
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
} from "../../../../../capabilities/identity/implementation/repositories";
import { TenantId, WorkspaceId } from "../../../../../capabilities/identity/implementation/contracts/identity.contracts";

const CreateTenantRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});

function slugifyForTenant(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "organization";
}

function authFailureResponse() {
  const anonymous = createAnonymousWorkspaceSession();
  const response = NextResponse.json(
    {
      error: "Authentication required",
      authenticated: false,
    },
    { status: 401 },
  );
  response.cookies.set({
    name: WORKSPACE_SESSION_COOKIE,
    value: encodeWorkspaceSession(anonymous),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export async function POST(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  if (!session || !isAuthenticatedSession(session)) {
    return authFailureResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateTenantRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  const { name } = parsed.data;
  const slugBase = parsed.data.slug ? slugifyForTenant(parsed.data.slug) : slugifyForTenant(name);
  let slug = slugBase;
  let counter = 1;
  while (TenantRepositoryInMemory.bySlug(slug) !== undefined) {
    counter += 1;
    slug = `${slugBase}-${counter}`;
  }

  type CreateTenantOutput = { readonly tenantId: string; readonly name: string; readonly slug: string };

  try {
    const tenantOutput = capabilityRegistry.invoke<CreateTenantOutput>("identity", "createTenant", {
      name,
      slug,
    });

    const tenant = TenantRepositoryInMemory.byId(TenantId(tenantOutput.output.tenantId));

    return NextResponse.json(
      {
        ok: true,
        tenant: {
          id: tenantOutput.output.tenantId,
          name: tenantOutput.output.name,
          slug: tenantOutput.output.slug,
          createdAt: tenant?.createdAt ?? new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Slug already taken")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  if (!session || !isAuthenticatedSession(session)) {
    const anonymous = createAnonymousWorkspaceSession();
    const response = NextResponse.json(
      {
        error: "Authentication required",
        authenticated: false,
      },
      { status: 401 },
    );
    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: encodeWorkspaceSession(anonymous),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  const tenantId = TenantId(session.tenantId);
  const tenant = TenantRepositoryInMemory.byId(tenantId);
  if (tenant === undefined) {
    return NextResponse.json(
      { error: "Tenant not found", authenticated: true, tenantId: session.tenantId },
      { status: 404 },
    );
  }

  // ENFORCE TENANT ISOLATION: only return workspaces/memberships that the authenticated user has access to for THEIR tenant
  const workspaces = WorkspaceRepositoryInMemory.listByTenant(tenantId);
  const memberships = MembershipRepositoryInMemory.listByTenant(tenantId).filter((m) => m.userId === session.actorId);
  const workspaceDetails = workspaces.map((w) => {
    const membership = memberships.find((m) => m.workspaceId === w.id);
    return {
      id: w.id,
      name: w.name,
      productId: w.productId,
      createdAt: w.createdAt,
      role: membership?.role ?? null,
      membershipId: membership?.id ?? null,
    };
  }).filter(ws => ws.membershipId !== null); // Only return workspaces the user is actually a member of

  return NextResponse.json({
    ok: true,
    authenticated: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    },
    workspaces: workspaceDetails,
    actorId: session.actorId,
  });
}