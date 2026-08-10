import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readWorkspaceSessionFromRequest,
  isAuthenticatedSession,
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  createAnonymousWorkspaceSession,
} from "@repo/core-kernel";
import {
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
  TenantRepositoryInMemory,
} from "../../../../../capabilities/identity/implementation/repositories";
import { WorkspaceId, UserId, TenantId, MembershipId } from "../../../../../capabilities/identity/implementation/contracts/identity.contracts";
import { capabilityRegistry } from "../../../lib/capability-command-registry";

const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
  productId: z.string().min(1),
  tenantId: z.string().min(1).optional(),
});

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

  const parsed = CreateWorkspaceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  const { name, productId } = parsed.data;
  const resolvedTenantId = TenantId(parsed.data.tenantId ?? session.tenantId);

  const tenant = TenantRepositoryInMemory.byId(resolvedTenantId);
  if (tenant === undefined) {
    return NextResponse.json({ error: `Tenant not found: ${resolvedTenantId}` }, { status: 404 });
  }

  type CreateWorkspaceOutput = {
    readonly workspaceId: string;
    readonly tenantId: string;
    readonly name: string;
    readonly productId: string;
  };
  type CreateMembershipOutput = {
    readonly membershipId: string;
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly role: "owner" | "admin" | "member";
  };

  try {
    const workspaceOutput = capabilityRegistry.invoke<CreateWorkspaceOutput>("identity", "createWorkspace", {
      tenantId: resolvedTenantId,
      name,
      productId,
    });

    const workspaceId = WorkspaceId(workspaceOutput.output.workspaceId);
    const userId = UserId(session.actorId);

    const membershipOutput = capabilityRegistry.invoke<CreateMembershipOutput>("identity", "createMembership", {
      userId,
      tenantId: resolvedTenantId,
      workspaceId,
      role: "owner" as const,
    });

    const workspace = WorkspaceRepositoryInMemory.byId(workspaceId);
    const membership = MembershipRepositoryInMemory.byId(MembershipId(membershipOutput.output.membershipId));

    return NextResponse.json(
      {
        ok: true,
        workspace: {
          id: workspaceOutput.output.workspaceId,
          name: workspaceOutput.output.name,
          productId: workspaceOutput.output.productId,
          tenantId: workspaceOutput.output.tenantId,
          createdAt: workspace?.createdAt ?? new Date().toISOString(),
          updatedAt: workspace?.updatedAt ?? new Date().toISOString(),
        },
        membership: {
          id: membershipOutput.output.membershipId,
          role: membershipOutput.output.role,
          userId: membershipOutput.output.userId,
          tenantId: membershipOutput.output.tenantId,
          workspaceId: membershipOutput.output.workspaceId,
          joinedAt: membership?.joinedAt ?? new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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

  const workspaceId = WorkspaceId(session.workspaceId);
  const workspace = WorkspaceRepositoryInMemory.byId(workspaceId);
  if (workspace === undefined) {
    return NextResponse.json(
      { error: "Workspace not found", authenticated: true, workspaceId: session.workspaceId },
      { status: 404 },
    );
  }

  const userId = UserId(session.actorId);
  const membership = MembershipRepositoryInMemory.find(userId, workspace.tenantId, workspaceId);
  const tenant = TenantRepositoryInMemory.byId(workspace.tenantId);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      productId: workspace.productId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    },
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        }
      : null,
    membership: membership
      ? {
          id: membership.id,
          role: membership.role,
          joinedAt: membership.joinedAt,
        }
      : null,
    actorId: session.actorId,
    sessionProductId: session.productId,
  });
}