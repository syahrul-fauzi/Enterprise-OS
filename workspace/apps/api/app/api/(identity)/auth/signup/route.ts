import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities-work-core/contracts/work.contracts.js";

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
  // 1. Validasi boundary compliance TERLEBIH DAHULU (Tahap B mandate - api-gateway mengakses identity)
  if (!validateBoundaryAccess("api-gateway", "identity")) {
    console.error("[signup-api] BOUNDARY ACCESS DENIED: api-gateway cannot access identity domain directly");
    return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
  }

  // Inisialisasi Node.js modules terlebih dahulu
  await initNodeRuntime();
  
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
    // 4. Buat actorContext untuk audit tracing (sesuai requirement evidence chain - canonical pattern)
    const actorContext = {
      actorId: sessionContext?.actorId || "system:anonymous",
      actorLabel: sessionContext?.actorLabel || "Anonymous User",
      tenantId: sessionContext?.tenantId || "system:new-tenant",
      workspaceId: sessionContext?.workspaceId || "system:new-workspace"
    };
    const productId = sessionContext?.productId || "lawyershub";
    
    // 5. Dapatkan capability registry dan invoke canonical identity.signupFlow capability (pure adapter pattern)
    const capabilityRegistry = await getCapabilityRegistry();
    if (!capabilityRegistry?.invoke) {
      console.error("[SIGNUP] Capability registry not available");
      return NextResponse.json({ error: "System unavailable" }, { status: 503 });
    }
    const signupResult = await capabilityRegistry.invoke<{
      userId: string;
      tenantId: string;
      workspaceId: string;
      membershipId: string;
      actorId: string;
      actorLabel: string;
      email: string;
    }>("identity.signupFlow", {
      email,
      password,
      displayName: fullName,
      productId: actorContext.productId,
    });

    if (!signupResult.userId || !signupResult.tenantId || !signupResult.workspaceId) {
      console.error("[SIGNUP FAIL] Registration failed: incomplete result from signupFlow");
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
    }
    
    // Buat WorkspaceSession yang valid dari hasil signupFlow (canonical session creation)
    const session: WorkspaceSession = {
      sessionId: signupResult.membershipId, // Menggunakan membershipId sebagai sessionId sementara (sesuai pattern)
      actorId: signupResult.actorId,
      actorLabel: signupResult.actorLabel,
      tenantId: signupResult.tenantId,
      workspaceId: signupResult.workspaceId,
      productId: actorContext.productId,
      issuedAt: new Date().toISOString(),
    };
    
    console.log("[SIGNUP SUCCESS] New account created via canonical capability:", signupResult.userId);

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