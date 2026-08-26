import { z } from "zod";
import { randomUUID } from "node:crypto";

export const WORKSPACE_SESSION_COOKIE = "eos-workspace-session";

export const WorkspaceSessionSchema = z.object({
  sessionId: z.string().optional(),
  actorId: z.string().min(1),
  actorLabel: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  productId: z.string().min(1),
  issuedAt: z.string().min(1),
});

export type WorkspaceSession = z.infer<typeof WorkspaceSessionSchema>;

export interface WorkspaceRequestTrace {
  readonly requestId: string;
  readonly traceId: string;
  readonly intent: string;
}

export const ANONYMOUS_ACTOR_ID = "anonymous.user";

const ANONYMOUS_SESSION_TEMPLATE = Object.freeze({
  actorId: ANONYMOUS_ACTOR_ID,
  actorLabel: "Anonymous Visitor",
  tenantId: "tenant.anonymous",
  workspaceId: "professional-workspace.anonymous",
  productId: "services-id.default",
});

export function createAnonymousWorkspaceSession(): WorkspaceSession {
  return {
    actorId: ANONYMOUS_SESSION_TEMPLATE.actorId,
    actorLabel: ANONYMOUS_SESSION_TEMPLATE.actorLabel,
    tenantId: ANONYMOUS_SESSION_TEMPLATE.tenantId,
    workspaceId: ANONYMOUS_SESSION_TEMPLATE.workspaceId,
    productId: ANONYMOUS_SESSION_TEMPLATE.productId,
    sessionId: `session-${randomUUID()}`,
    issuedAt: new Date().toISOString(),
  };
}

export function isAuthenticatedSession(session: WorkspaceSession | null | undefined): boolean {
  if (!session) return false;
  const id = session.actorId;
  if (id === ANONYMOUS_ACTOR_ID) return false;
  if (id.startsWith("user-")) return true;
  return false;
}

export function encodeWorkspaceSession(session: WorkspaceSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeWorkspaceSession(raw: string | undefined): WorkspaceSession | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    return WorkspaceSessionSchema.parse(JSON.parse(decoded));
  } catch {
    return null;
  }
}

export function readWorkspaceSessionFromCookieHeader(
  cookieHeader: string | null,
): WorkspaceSession | null {
  if (!cookieHeader?.trim()) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${WORKSPACE_SESSION_COOKIE}=`));

  if (!cookie) {
    return null;
  }

  return decodeWorkspaceSession(cookie.slice(`${WORKSPACE_SESSION_COOKIE}=`.length));
}

export function readWorkspaceSessionFromRequest(
  request: Request,
): WorkspaceSession | null {
  return readWorkspaceSessionFromCookieHeader(request.headers.get("cookie"));
}

export function createWorkspaceRequestTrace(
  request: Request,
  intent: string,
): WorkspaceRequestTrace {
  const requestId =
    request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const traceId =
    request.headers.get("x-trace-id")?.trim() || requestId;

  return {
    requestId,
    traceId,
    intent,
  };
}

export function createWorkspaceContextHeaders(input: {
  readonly session: WorkspaceSession;
  readonly trace: WorkspaceRequestTrace;
}): Headers {
  const headers = new Headers();
  headers.set("x-eos-actor-id", input.session.actorId);
  headers.set("x-eos-tenant-id", input.session.tenantId);
  headers.set("x-eos-workspace-id", input.session.workspaceId);
  headers.set("x-eos-request-id", input.trace.requestId);
  headers.set("x-eos-trace-id", input.trace.traceId);
  headers.set("x-eos-intent", input.trace.intent);
  return headers;
}