import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateBoundaryAccess } from "@repo/capabilities-work-core/contracts/work.contracts.js";
import { 
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession, 
  decodeWorkspaceSession, 
  type WorkspaceSession 
} from "@repo/core-kernel";

// Lazy load capability registry sesuai pattern canonical yang digunakan di semua route (hindari module cycle)
async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

// Lazy initialization untuk kompatibilitas Edge Runtime
let crypto: typeof import("node:crypto");

async function initNodeRuntime() {
  if (!crypto) {
    const nodeCrypto = await import("node:crypto");
    crypto = nodeCrypto;
  }
}

export async function GET(request: Request) {
  // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - api-gateway mengakses identity)
  if (!validateBoundaryAccess("api-gateway", "identity")) {
    console.error("[callback-api] BOUNDARY ACCESS DENIED: api-gateway cannot access identity domain directly");
    return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
  }

  // Inisialisasi Node.js modules terlebih dahulu
  await initNodeRuntime();
  
  // Canonical auth validation: gunakan decodeWorkspaceSession untuk memproses request context
  const session = await decodeWorkspaceSession(request);
  
  // Dapatkan capability registry untuk invoke canonical identity capability
  const capabilityRegistry = await getCapabilityRegistry();
  if (!capabilityRegistry?.invoke) {
    console.error("[OIDC] Capability registry not available");
    return NextResponse.redirect("/login?error=system_unavailable");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  
  const cookieStore = await cookies();
  let redirectUrl = "/login?error=unknown_error";

  if (error) {
    console.error("[OIDC] Callback error:", error);
    redirectUrl = "/login?error=oidc_auth_failed";
  } else if (!code || !state) {
    redirectUrl = "/login?error=invalid_oidc_callback";
  } else {
    // Validate state and code verifier from cookies
    const storedState = cookieStore.get("oidc_state")?.value;
    const codeVerifier = cookieStore.get("oidc_code_verifier")?.value;

    if (state !== storedState) {
      redirectUrl = "/login?error=invalid_state_mismatch";
    } else if (!codeVerifier) {
      redirectUrl = "/login?error=missing_code_verifier";
    } else {
      try {
        // P1-AUTH-006: actorContext lengkap untuk audit dan tracing sesuai EOS evidence chain requirements (konsisten dengan route lain)
        const actorContext = {
          actorId: session?.actorId || "system:anonymous",
          actorLabel: session?.actorLabel || "Anonymous User",
          tenantId: session?.tenantId || "system:default",
          workspaceId: session?.workspaceId || "system:default"
        };
        
        // Invoke canonical OIDC login flow capability through capability registry (identity.oidcCallbackFlow tidak terdaftar, gunakan identity.oidcLoginFlow yang tersedia)
        const callbackResult = await capabilityRegistry.invoke<{
          success: boolean;
          redirectUrl?: string;
          error?: string;
          verificationPassed: boolean;
          session?: WorkspaceSession;
        }>("identity.oidcLoginFlow", {
          code,
          redirectUri: process.env.OIDC_REDIRECT_URI || "http://127.0.0.1:3007/api/auth/callback",
          state,
          actorContext
        });

        if (!callbackResult.verificationPassed) {
          throw new Error(callbackResult.error || "OIDC callback failed: verification not passed");
        }

        if (!callbackResult.session) {
          throw new Error("OIDC callback succeeded but no session returned from capability");
        }

        // Canonical session persistence: encode dan set session cookie sesuai pattern auth routes lain
        const encodedSession = encodeWorkspaceSession(callbackResult.session);
        
        // Clear OIDC cookies after successful processing
        const response = NextResponse.redirect("/workspace");
        cookieStore.delete("oidc_state");
        cookieStore.delete("oidc_code_verifier");
        
        // Set canonical workspace session cookie (AUTH_INCONSISTENCY fix: P1-AUTH-006)
        cookieStore.set(WORKSPACE_SESSION_COOKIE, encodedSession, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production"
        });

        return response;

      } catch (error) {
        console.error("[OIDC] Callback processing failed:", error);
        return NextResponse.redirect("/login?error=oidc_processing_failed");
      }
    }
  }

  // If we reach here, redirect with error
  return NextResponse.redirect(redirectUrl);
}