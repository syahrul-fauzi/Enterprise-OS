import { NextResponse } from "next/server";
import { z } from "zod";

const OIDCLoginRequestSchema = z.object({
  redirectUri: z.string().url().optional(),
});

// Hydra configuration from docker-compose.yml
const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://127.0.0.1:4444";
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://127.0.0.1:4445";
const CLIENT_ID = process.env.OIDC_CLIENT_ID || "lawyershub-client";
const REDIRECT_URI = process.env.OIDC_REDIRECT_URI || "http://127.0.0.1:3007/api/auth/callback";

export async function POST(request: Request) {
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

  try {
    // Generate OAuth2 authorization URL with Hydra
    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    // Simple code challenge generation (in production use S256)
    const codeChallenge = Buffer.from(codeVerifier).toString('base64url');
    
    const authUrl = new URL(`${HYDRA_PUBLIC_URL}/oauth2/auth`);
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "plain");

    // Store code verifier and state in cookies for callback validation
    const response = NextResponse.json({
      ok: true,
      authorizationUrl: authUrl.toString(),
    });
    
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