import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateBoundaryAccess, decodeWorkspaceSession, WORKSPACE_SESSION_COOKIE } from "@repo/capabilities-work-core/contracts/work.contracts.js";
import { initNodeRuntime } from "@repo/core-kernel/runtime/node/index.js";

// Lazy load capability registry to avoid module cycles
async function getCapabilityRegistry() {
  const { CapabilityRegistry } = await import("@repo/capability-dispatch/registry.js");
  return CapabilityRegistry.getInstance();
}

// Kemenkumham Government IDP configuration - preserved for IDP detection
const KEMENKUMHAM_CALLBACK_PATH = "/api/auth/callback/kemenkumham";

// IDP configuration resolver - preserved to detect government IDP
function getIdpType(req: Request) {
  const url = new URL(req.url);
  return {
    isGovernmentIdp: url.pathname === KEMENKUMHAM_CALLBACK_PATH,
    redirectUri: process.env.OIDC_REDIRECT_URI || "http://0.0.0.0:3000/api/auth/callback"
  };
}

export async function GET(request: Request) {
  // Initialize Node runtime for Node.js-only APIs (Edge compatibility)
  await initNodeRuntime();

  // Enforce 6-boundary compliance: identity domain can only access work-core with explicit validation
  if (!validateBoundaryAccess("identity", "work-core")) {
    console.error("[OIDC] Boundary access denied: identity domain cannot access work-core");
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[OIDC] Callback error:", error);
    return NextResponse.redirect("/login?error=oidc_auth_failed");
  }

  if (!code || !state) {
    return NextResponse.redirect("/login?error=invalid_oidc_callback");
  }

  // Validate state and code verifier from cookies
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oidc_state")?.value;
  const codeVerifier = cookieStore.get("oidc_code_verifier")?.value;

  if (state !== storedState) {
    return NextResponse.redirect("/login?error=invalid_state_mismatch");
  }

  if (!codeVerifier) {
    return NextResponse.redirect("/login?error=missing_code_verifier");
  }

  // Get canonical workspace session context (upholds "Workspace bukan identitas/authority" invariant)
  const sessionContext = await decodeWorkspaceSession(request);

  try {
    // Get lazy-loaded capability registry to avoid module cycles
    const capabilityRegistry = await getCapabilityRegistry();
    
    // Resolve IDP type before invoking canonical capability (preserve Kemenkumham IDP detection)
    const idpType = getIdpType(request);

    // Invoke canonical identity.oidc-callback capability - all business logic moved to identity domain
    const callbackResult = await capabilityRegistry.invoke("identity.oidc-callback", {
      code,
      state,
      codeVerifier,
      idpType,
      sessionContext,
      requestUrl: request.url
    });

    if (!callbackResult.success) {
      console.error("[OIDC] Callback capability failed:", callbackResult.error);
      return NextResponse.redirect(`/login?error=${callbackResult.errorCode || "oidc_processing_failed"}`);
    }

    // Clear OIDC cookies after successful processing
    const response = NextResponse.redirect("/workspace");
    cookieStore.delete("oidc_state");
    cookieStore.delete("oidc_code_verifier");

    // Set canonical workspace session cookie from capability result
    response.cookies.set(WORKSPACE_SESSION_COOKIE, callbackResult.workspaceSessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days (matches canonical session duration)
    });

    return response;

  } catch (error) {
    console.error("[OIDC] Callback processing failed:", error);
    return NextResponse.redirect("/login?error=oidc_processing_failed");
  }
}