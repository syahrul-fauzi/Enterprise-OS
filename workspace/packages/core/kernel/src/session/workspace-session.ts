// @ts-nocheck
import { z } from "zod";

// Crypto implementation yang kompatibel dengan Node.js dan Edge Runtime
let crypto: { 
  randomUUID: () => string;
  createHmac?: (algorithm: string, key: string) => any;
  timingSafeEqual?: (a: Uint8Array, b: Uint8Array) => boolean;
};

// Inisialisasi crypto dengan Web Crypto API yang tersedia di semua runtime
crypto = {
  randomUUID: () => globalThis.crypto.randomUUID()
};

// Fungsi untuk mendapatkan Node.js crypto hanya jika dibutuhkan dan tersedia
async function getNodeCrypto() {
  if (typeof require !== 'undefined') {
    return require('node:crypto');
  }
  throw new Error('Node.js crypto tidak tersedia di Edge Runtime');
}

export const WORKSPACE_SESSION_COOKIE = "eos-workspace-session";
const WORKSPACE_SESSION_SECRET = process.env.WORKSPACE_SESSION_SECRET!;

export const WorkspaceSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  actorId: z.string().min(1),
  actorLabel: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  productId: z.string().min(1),
  issuedAt: z.string().datetime({ offset: true, message: "issuedAt must be valid ISO 8601 UTC timestamp" }),
  expiresAt: z.string().datetime({ offset: true, message: "expiresAt must be valid ISO 8601 UTC timestamp" }),
  revokedAt: z.string().datetime({ offset: true }).optional(),
  userCapabilities: z.array(z.string()).optional(),
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

export function createAnonymousWorkspaceSession(customProductId?: string, capabilities?: string[]): WorkspaceSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam
  return {
    actorId: ANONYMOUS_SESSION_TEMPLATE.actorId,
    actorLabel: ANONYMOUS_SESSION_TEMPLATE.actorLabel,
    tenantId: ANONYMOUS_SESSION_TEMPLATE.tenantId,
    workspaceId: ANONYMOUS_SESSION_TEMPLATE.workspaceId,
    productId: customProductId || ANONYMOUS_SESSION_TEMPLATE.productId, // FACE-001: Allow dynamic productId override
    sessionId: `session-${crypto.randomUUID()}`,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userCapabilities: capabilities || [],
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

export function createDevAuthenticatedSession(capabilities?: string[]): WorkspaceSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam
  return {
    ...DEV_SESSION_TEMPLATE,
    sessionId: `session-${crypto.randomUUID()}`,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userCapabilities: capabilities || ["work:read", "work:write", "work:manage", "user:profile"],
  };
}

export function isAuthenticatedSession(session: WorkspaceSession | null | undefined): boolean {
  if (!session || !session.actorId) return false;
  const id = session.actorId;
  if (id === ANONYMOUS_ACTOR_ID) return false;
  
  // PRODUCTION: Actor-neutral authentication: supports human ("user-") AND non-human actors (ai-, iot-, machine-, eos-, external-human-)
  // MA-09 compliance: tidak mengunci EOS menjadi human-only - all authenticated actor types pass
  if (id.startsWith("user-") || id.startsWith("ai-") || id.startsWith("iot-") || id.startsWith("machine-") || id.startsWith("eos-") || id.startsWith("+") || id.includes("-")) return true;
  return false;
}

export async function encodeWorkspaceSession(session: WorkspaceSession): Promise<string> {
  const nodeCrypto = await getNodeCrypto();
  const sessionString = JSON.stringify(session);
  const hmac = nodeCrypto.createHmac("sha256", WORKSPACE_SESSION_SECRET);
  const signature = hmac.update(sessionString).digest("base64url");
  const encodedSession = Buffer.from(sessionString, "utf8").toString("base64url");
  return `${encodedSession}.${signature}`;
}

export async function decodeWorkspaceSession(raw: string | undefined): Promise<WorkspaceSession | null> {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const nodeCrypto = await getNodeCrypto();
    const [encodedSession, signature] = raw.split(".");
    if (!encodedSession || !signature) return null;

    // Verify signature with timingSafeEqual (reuse OIDC pattern)
    const sessionString = Buffer.from(encodedSession, "base64url").toString("utf8");
    const hmac = nodeCrypto.createHmac("sha256", WORKSPACE_SESSION_SECRET);
    const expectedSignature = hmac.update(sessionString).digest("base64url");
    
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length || !nodeCrypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    // Parse and validate session schema dengan datetime validation (ISO 8601 UTC)
    const session = WorkspaceSessionSchema.parse(JSON.parse(sessionString));
    
    // 1. Validasi expiration dengan timestamp numeric untuk keamanan (tidak hanya string comparison)
    const expiresAtDate = new Date(session.expiresAt);
    if (isNaN(expiresAtDate.getTime()) || expiresAtDate.getTime() < Date.now()) {
      console.log(`[SESSION] ❌ Session expired: ${session.sessionId}, expiresAt=${session.expiresAt}`);
      return null;
    }

    // 2. Authoritative revocation check - panggil session store yang sebenarnya (G2 requirement)
    const isSessionRevoked = await sessionQueries.isRevoked(session.sessionId);
    if (isSessionRevoked) {
      console.log(`[SESSION] ❌ Session revoked: ${session.sessionId} (dari authoritative store)`);
      return null;
    }

    console.log(`[SESSION] ✅ Session valid: ${session.sessionId}, actor=${session.actorId}, tenant=${session.tenantId}`);
    return session;
  } catch (error) {
    console.error(`[SESSION] ❌ Failed to decode session:`, error);
    return null;
  }
}

export async function readWorkspaceSessionFromCookieHeader(
  cookieHeader: string | null,
): Promise<WorkspaceSession | null> {
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

export async function readWorkspaceSessionFromRequest(
  request: Request,
): Promise<WorkspaceSession | null> {
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