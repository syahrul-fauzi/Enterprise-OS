import { NextResponse } from "next/server";
import { z } from "zod";
import { LoginInputSchema, UserId, TenantId, WorkspaceId } from "../../../../../../capabilities/identity/implementation/contracts/identity.contracts";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  isAuthenticatedSession,
  createAnonymousWorkspaceSession,
  capabilityRegistry,
  type WorkspaceSession,
} from "@repo/core-kernel";
import {
  UserRepositoryInMemory,
  MembershipRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  TenantRepositoryInMemory,
} from "../../../../../../capabilities/identity/implementation/repositories";

type AuthCommandOutput = {
  readonly authenticated: boolean;
  readonly userId: string | undefined;
  readonly actorId: string | undefined;
  readonly actorLabel: string | undefined;
  readonly tenantId: string | undefined;
  readonly workspaceId: string | undefined;
  readonly productId: string | undefined;
  readonly role: string | undefined;
  readonly session: {
    readonly sessionId: string;
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly productId: string;
    readonly actorLabel: string;
    readonly issuedAt: string;
    readonly expiresAt: string;
  } | undefined;
};

const LoginRequestSchema = LoginInputSchema;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LoginRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  const { email, password } = parsed.data;

  const authResult = capabilityRegistry.invoke<AuthCommandOutput>("identity", "authenticateUser", { email, password });
  const output = authResult.output;

  if (!output.authenticated || !output.userId) {
    const anonymous = createAnonymousWorkspaceSession();
    const response = NextResponse.json(
      {
        ok: false,
        authenticated: false,
        error: "Invalid email or password",
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

  const userId = UserId(output.userId);
  const user = UserRepositoryInMemory.byId(userId);
  const memberships = MembershipRepositoryInMemory.listByUser(userId);
  const primaryMembership = memberships[0];
  const tenantIdStr = output.tenantId ?? primaryMembership?.tenantId ?? "tenant.anonymous";
  const workspaceIdStr = output.workspaceId ?? primaryMembership?.workspaceId ?? "professional-workspace.anonymous";
  const workspace = WorkspaceRepositoryInMemory.byId(WorkspaceId(workspaceIdStr));
  const tenant = TenantRepositoryInMemory.byId(TenantId(tenantIdStr));
  const actorLabel = output.actorLabel ?? output.actorLabel ?? user?.displayName ?? "User";
  const productId = output.productId ?? workspace?.productId ?? "services-id.default";

  const sessionId = output.session?.sessionId;

  const session: WorkspaceSession = {
    sessionId,
    actorId: userId,
    actorLabel,
    tenantId: tenantIdStr,
    workspaceId: workspaceIdStr,
    productId,
    issuedAt: output.session?.issuedAt ?? new Date().toISOString(),
  };

  const authenticated = isAuthenticatedSession(session);

  const response = NextResponse.json(
    {
      ok: true,
      authenticated,
      actorId: session.actorId,
      actorLabel: session.actorLabel,
      userId: output.userId,
      tenantId: tenantIdStr,
      tenantName: tenant?.name ?? null,
      workspaceId: workspaceIdStr,
      workspaceName: workspace?.name ?? null,
      role: output.role ?? primaryMembership?.role ?? null,
      productId: session.productId,
      sessionId,
      expiresAt: output.session?.expiresAt,
      record: authResult.record,
    },
    { status: 200 },
  );

  response.cookies.set({
    name: WORKSPACE_SESSION_COOKIE,
    value: encodeWorkspaceSession(session),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}