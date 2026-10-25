import { NextResponse } from "next/server";
import { z } from "zod";
import {
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

const OIDCLoginRequestSchema = z.object({
  redirectUri: z.string().url().optional(),
});

// Hydra configuration from docker-compose.yml
const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://0.0.0.0:4444";
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://0.0.0.0:4445";
const CLIENT_ID = process.env.OIDC_CLIENT_ID || "lawyershub-client";
const REDIRECT_URI = process.env.OIDC_REDIRECT_URI || "http://0.0.0.0:3000/api/auth/callback";

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

  const parsed = OIDCLoginRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  const { redirectUri } = parsed.data;

  try {
    // 4. Dapatkan capability registry dan invoke canonical identity.oidc-initiate capability (pure adapter pattern)
    const capabilityRegistry = await getCapabilityRegistry();
    const oidcResult = await capabilityRegistry.invoke<{
      success: boolean;
      authorizationUrl?: string;
      state?: string;
      codeVerifier?: string;
      error?: string;
    }>("identity.oidc-initiate", {
      redirectUri: redirectUri || REDIRECT_URI,
      hydraPublicUrl: HYDRA_PUBLIC_URL,
      clientId: CLIENT_ID,
      requestOrigin: request.headers.get("origin"),
      sessionContext
    });

    if (!oidcResult.success || !oidcResult.authorizationUrl || !oidcResult.state || !oidcResult.codeVerifier) {
      console.error("[OIDC FAIL] Login initiation failed:", oidcResult.error);
      return NextResponse.json({ error: oidcResult.error || "Failed to initiate OIDC login flow" }, { status: 400 });
    }
    
    const { authorizationUrl, state, codeVerifier } = oidcResult;
    console.log("[OIDC SUCCESS] Login flow initiated via canonical capability:", state);

    // Store code verifier and state in cookies for callback validation
    const response = NextResponse.json({
      ok: true,
      authorizationUrl,
    }, { status: 200 });
    
    // Set secure cookies for OAuth flow state
    response.cookies.set("oidc_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });
    
    response.cookies.set("oidc_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });

    return response;
  } catch (error) {
    console.error("[OIDC] Login initiation failed:", error);
    return NextResponse.json({ 
      error: "Failed to initiate OIDC login flow",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}