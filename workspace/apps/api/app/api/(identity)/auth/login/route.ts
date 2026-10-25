import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
// Import 6-boundary validation function dari package kanonis (Tahap B mandate)
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

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate)
  if (!validateBoundaryAccess("api-gateway", "identity")) {
    console.error("[login-api] BOUNDARY ACCESS DENIED: api-gateway cannot access identity domain directly");
    return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
  }

  // Inisialisasi Node.js modules terlebih dahulu
  await initNodeRuntime();
  
  // Canonical auth validation: gunakan decodeWorkspaceSession untuk memproses request context
  const session = await decodeWorkspaceSession(request);
  
  // Dapatkan capability registry untuk invoke canonical identity capability
  const capabilityRegistry = await getCapabilityRegistry();
  
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
    // Invoke canonical identity.loginFlow capability (pure adapter pattern - P1-CAP-013 yang sudah diperbaiki)
    const authenticationResult = await capabilityRegistry.invoke<{
      success: boolean;
      session?: WorkspaceSession;
      error?: string;
    }>("identity.loginFlow", {
      email,
      password,
      requestOrigin: request.headers.get("origin"),
      // Tambahkan actorContext untuk audit dan tracing sesuai pola yang diterapkan di semua command
      actorContext: {
        tenantId: session?.tenantId || "",
        workspaceId: session?.workspaceId || "",
        actorId: session?.actorId || ""
      }
    });
    
    if (!authenticationResult.success || !authenticationResult.session) {
      console.error("[LOGIN FAIL] Authentication failed:", authenticationResult.error);
      return NextResponse.json({ error: authenticationResult.error || "Invalid credentials" }, { status: 401 });
    }
    
    const session = authenticationResult.session;
    console.log("[LOGIN SUCCESS] Session created via canonical capability:", session.sessionId);

    const response = NextResponse.json(
      {
        ok: true,
        authenticated: true,
        actorId: session.actorId,
        actorLabel: session.actorLabel,
        userId: session.userId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        productId: session.productId,
        sessionId: session.sessionId,
        redirectUrl: "/my-reality",
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
    console.error("[login-api] Error:", err);
    if (err instanceof Error) {
      console.error("[login-api] Stack trace:", err.stack);
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}