import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  isAuthenticatedSession,
  createAnonymousWorkspaceSession,
  capabilityRegistry,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { LoginFlowInputSchema } from "../../../../../../capabilities/identity/implementation/commands/login-flow.command";

type LoginFlowOutput = {
  readonly authenticated: boolean;
  readonly userId: string;
  readonly actorId: string;
  readonly actorLabel: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly productId: string;
  readonly sessionId: string;
  readonly email: string;
};

const LoginRequestSchema = LoginFlowInputSchema;

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

  try {
    // Single canonical command invocation - all orchestration in capability layer
    const loginOutput = await capabilityRegistry.invokeAsync<LoginFlowOutput>("identity", "loginFlow", { 
      email, 
      password 
    });
    
    const output = loginOutput.output;

    const session: WorkspaceSession = {
      sessionId: output.sessionId,
      actorId: output.actorId,
      actorLabel: output.actorLabel,
      tenantId: output.tenantId,
      workspaceId: output.workspaceId,
      productId: output.productId,
      issuedAt: new Date().toISOString(),
      userId: output.userId,
    } as WorkspaceSession;

    const authenticated = isAuthenticatedSession(session);

    const response = NextResponse.json(
      {
        ok: true,
        authenticated,
        actorId: session.actorId,
        actorLabel: session.actorLabel,
        userId: output.userId,
        tenantId: output.tenantId,
        workspaceId: output.workspaceId,
        productId: session.productId,
        sessionId: output.sessionId,
        record: loginOutput.record,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Invalid email or password")) {
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}