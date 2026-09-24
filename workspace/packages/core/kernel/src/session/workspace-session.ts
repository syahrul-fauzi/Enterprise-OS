import { z } from "zod";
import { randomUUID, randomUUID as cryptoRandomUUID } from "node:crypto";
const crypto = { randomUUID: cryptoRandomUUID };

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

// ANONYMOUS_SESSION_TEMPLATE: Sesi anonim harus menggunakan actorId yang benar
const ANONYMOUS_SESSION_TEMPLATE = Object.freeze({
  actorId: ANONYMOUS_ACTOR_ID, // Anonim = anonymous.user - tidak lulus isAuthenticatedSession
  actorLabel: "Anonymous Visitor",
  tenantId: "tenant.anonymous",
  workspaceId: "professional-workspace.anonymous",
  productId: "lawyershub.default", // PR-VISUAL-001: Default product ke lawyershub
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

// DEV MODE: Buat dev session terpisah untuk development yang lulus VF-05A
const DEV_SESSION_TEMPLATE = Object.freeze({
  actorId: "user-dev-john-doe", // Valid user-* actorId untuk development
  actorLabel: "John Doe",
  tenantId: "tenant.lawyershub",
  workspaceId: "professional-workspace.lawyershub",
  productId: "lawyershub", // PR-VISUAL-001: Lawyershub sebagai default product
});

export function createDevAuthenticatedSession(): WorkspaceSession {
  return {
    ...DEV_SESSION_TEMPLATE,
    sessionId: `session-${randomUUID()}`,
    issuedAt: new Date().toISOString(),
  };
}

export function isAuthenticatedSession(session: WorkspaceSession | null | undefined): boolean {
  if (!session) return false;
  const id = session.actorId;
  if (id === ANONYMOUS_ACTOR_ID) return false;
  
  // PRODUCTION: Actor-neutral authentication: supports human ("user-") AND non-human actors (ai-, iot-, machine-, eos-, external-human-)
  // MA-09 compliance: tidak mengunci EOS menjadi human-only - all authenticated actor types pass
  if (id.startsWith("user-") || id.startsWith("ai-") || id.startsWith("iot-") || id.startsWith("machine-") || id.startsWith("eos-") || id.startsWith("+") || id.includes("-")) return true;
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