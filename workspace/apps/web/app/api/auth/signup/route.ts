import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts.js";

// Lazy load capabilityRegistry sesuai pattern yang digunakan di semua route EOS (hindari module cycle)
async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

// Lazy initialization tetap dipertahankan untuk kompatibilitas Edge Runtime
let crypto: typeof import("node:crypto");

async function initNodeRuntime() {
  if (!crypto) {
    const nodeCrypto = await import("node:crypto");
    crypto = nodeCrypto;
  }
}

const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  organizationName: z.string().min(2),
});

export async function POST(request: Request) {
  // Inisialisasi Node.js modules terlebih dahulu
  await initNodeRuntime();
  
  // 1. Validasi boundary compliance (6-boundary) sesuai Tahap B mandate
  if (!validateBoundaryAccess("identity", "work-core")) {
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }
  
  // 2. Canonical session handling menggunakan decodeWorkspaceSession (mematuhi "Workspace bukan authority")
  const sessionContext = await decodeWorkspaceSession(request);
  
  // 3. Parse request body dengan validasi schema
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

  const { email, password, fullName, organizationName } = parsed.data;

  try {
    // 4. Dapatkan capability registry dan invoke canonical identity.signup capability (pure adapter pattern)
    const capabilityRegistry = await getCapabilityRegistry();
    const signupResult = await capabilityRegistry.invoke<{
      success: boolean;
      session?: WorkspaceSession;
      error?: string;
    }>("identity.signup", {
      email,
      password,
      fullName,
      organizationName,
      requestOrigin: request.headers.get("origin"),
      sessionContext
    });

    if (!signupResult.success || !signupResult.session) {
      console.error("[SIGNUP FAIL] Registration failed:", signupResult.error);
      return NextResponse.json({ error: signupResult.error || "Registration failed" }, { status: 400 });
    }
    
    const session = signupResult.session;
    console.log("[SIGNUP SUCCESS] New account created via canonical capability:", session.sessionId);

    const response = NextResponse.json(
      {
        ok: true,
        registered: true,
        actorId: session.actorId,
        actorLabel: session.actorLabel,
        userId: session.userId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        productId: session.productId,
        sessionId: session.sessionId,
        redirectUrl: "/onboarding",
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Email already registered")
      ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}