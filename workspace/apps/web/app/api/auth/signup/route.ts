import { NextResponse } from "next/server";
import { z } from "zod";
import { RegisterUserInputSchema, UserId, TenantId, WorkspaceId } from "../../../../../../capabilities/identity/implementation/contracts/identity.contracts";
import { 
  WORKSPACE_SESSION_COOKIE, 
  encodeWorkspaceSession, 
  isAuthenticatedSession,
  capabilityRegistry,
  type WorkspaceSession
} from "@repo/core-kernel";
import { TenantRepositoryInMemory, WorkspaceRepositoryInMemory } from "../../../../../../capabilities/identity/implementation/repositories";
import type { CreateSessionOutput } from "../../../../../../capabilities/identity/implementation/commands/login-user.command";

const SignupRequestSchema = RegisterUserInputSchema;

type RegisterUserOutput = {
  readonly userId: string;
  readonly actorId: string;
  readonly actorLabel: string;
  readonly email: string;
};

type CreateTenantOutput = {
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
};

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

function slugifyForTenant(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "personal";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SignupRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  const { email, password, displayName } = parsed.data;

  try {
    const userOutput = capabilityRegistry.invoke<RegisterUserOutput>("identity", "registerUser", { email, password, displayName });
    const userId = UserId(userOutput.output.userId);

    const emailLocalPart = email.split("@")[0] ?? displayName;
    const slugBase = slugifyForTenant(`${displayName}-${emailLocalPart}`);
    let slug = slugBase;
    let counter = 1;
    while (TenantRepositoryInMemory.bySlug(slug) !== undefined) {
      counter += 1;
      slug = `${slugBase}-${counter}`;
    }

    const tenantOutput = capabilityRegistry.invoke<CreateTenantOutput>("identity", "createTenant", {
      name: `${displayName} Personal`,
      slug,
    });
    const tenantId = TenantId(tenantOutput.output.tenantId);

    const workspaceOutput = capabilityRegistry.invoke<CreateWorkspaceOutput>("identity", "createWorkspace", {
      tenantId,
      name: "Professional Workspace",
      productId: "services-id.default",
    });
    const workspaceId = WorkspaceId(workspaceOutput.output.workspaceId);

    const membershipOutput = capabilityRegistry.invoke<CreateMembershipOutput>("identity", "createMembership", {
      userId,
      tenantId,
      workspaceId,
      role: "owner" as const,
    });

    const sessionOutput = capabilityRegistry.invoke<CreateSessionOutput>("identity", "createSession", {
      userId,
      tenantId,
      workspaceId,
      productId: "services-id.default",
      actorLabel: displayName,
    });

    const session: WorkspaceSession = {
      sessionId: sessionOutput.output.sessionId,
      actorId: userId,
      actorLabel: displayName,
      tenantId,
      workspaceId,
      productId: "services-id.default",
      issuedAt: new Date().toISOString(),
    };

    const authenticated = isAuthenticatedSession(session);

    const response = NextResponse.json(
      {
        ok: true,
        authenticated,
        userId: userOutput.output.userId,
        actorId: userOutput.output.actorId,
        actorLabel: userOutput.output.actorLabel,
        email: userOutput.output.email,
        tenantId: tenantOutput.output.tenantId,
        tenantName: tenantOutput.output.name,
        tenantSlug: tenantOutput.output.slug,
        workspaceId: workspaceOutput.output.workspaceId,
        workspaceName: workspaceOutput.output.name,
        productId: workspaceOutput.output.productId,
        membershipId: membershipOutput.output.membershipId,
        role: membershipOutput.output.role,
        sessionId: sessionOutput.output.sessionId,
        records: [userOutput.record, tenantOutput.record, workspaceOutput.record, membershipOutput.record, sessionOutput.record],
      },
      { status: 201 },
    );

    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: encodeWorkspaceSession(session),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Email already registered")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("Slug already taken")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}