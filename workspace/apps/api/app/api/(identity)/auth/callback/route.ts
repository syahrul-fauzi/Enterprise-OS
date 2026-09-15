import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  getUserRepositoryPostgres,
  getSessionRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  newSessionId,
  initIdentitySchema,
  type UserAggregate,
  type SessionAggregate,
  UserId,
  TenantId,
  WorkspaceId,
  MembershipId,
  SessionId,
} from "@repo/capabilities-identity";

// Hydra configuration
const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://127.0.0.1:4444";
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://127.0.0.1:4445";
const CLIENT_ID = process.env.OIDC_CLIENT_ID || "lawyershub-client";
const CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || "lawyershub-secret";
const REDIRECT_URI = process.env.OIDC_REDIRECT_URI || "http://127.0.0.1:3007/api/auth/callback";

const CallbackRequestSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// Helper to find or create user from OIDC claims
async function findOrCreateUser(claims: any): Promise<UserAggregate> {
  const userRepository = getUserRepositoryPostgres();
  const email = claims.email;
  
  if (!email) {
    throw new Error("OIDC token missing email claim");
  }

  // Check if user already exists
  const existingUser = await userRepository.byEmail(email);
  if (existingUser) {
    return existingUser;
  }

  // Create new user if not exists (auto-provisioning)
  const userId = UserId(randomUUID());
  const now = new Date();
  const newUser: UserAggregate = {
    id: userId,
    email: email,
    displayName: claims.name || email.split('@')[0],
    passwordHash: "", // OIDC users don't have local password
    createdAt: now,
    updatedAt: now,
  };

  await userRepository.save(newUser);
  return newUser;
}

// Helper to find or create tenant/workspace for new user
async function ensureUserMembership(userId: UserId) {
  const tenantRepository = getTenantRepositoryPostgres();
  const workspaceRepository = getWorkspaceRepositoryPostgres();
  const membershipRepository = getMembershipRepositoryPostgres();

  // Check if user already has any memberships
  const existingMemberships = await membershipRepository.listByUser(userId);
  if (existingMemberships.length > 0) {
    const firstMembership = existingMemberships[0];
    if (!firstMembership) {
      throw new Error("Failed to resolve existing membership");
    }
    const tenant = await tenantRepository.byId(firstMembership.tenantId);
    const workspaces = await workspaceRepository.listByTenant(firstMembership.tenantId);
    if (!tenant || workspaces.length === 0) {
      throw new Error("Failed to resolve existing tenant/workspace");
    }
    return {
      tenant,
      workspace: workspaces[0],
      membership: firstMembership,
    };
  }

  // Create default tenant and workspace for new user
  const now = new Date();
  const tenantId = TenantId(randomUUID());
  const workspaceId = WorkspaceId(randomUUID());
  const membershipId = MembershipId(randomUUID());

  // Create tenant
  await tenantRepository.save({
    id: tenantId,
    name: "Default Organization",
    slug: "default-organization",
    createdAt: now,
    updatedAt: now,
  });

  // Create workspace
  await workspaceRepository.save({
    id: workspaceId,
    tenantId: tenantId,
    name: "Default Workspace",
    slug: "default-workspace",
    productId: "lawyershub",
    createdAt: now,
    updatedAt: now,
  });

  // Create membership
  await membershipRepository.save({
    id: membershipId,
    userId: userId,
    tenantId: tenantId,
    workspaceId: workspaceId,
    role: "owner",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return {
    tenant: await tenantRepository.byId(tenantId),
    workspace: await workspaceRepository.byId(workspaceId),
    membership: await membershipRepository.byId(membershipId),
  };
}

export async function GET(request: Request) {
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

  try {
    // Initialize identity schema
    await initIdentitySchema();

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(`${HYDRA_PUBLIC_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("[OIDC] Token exchange failed:", tokenError);
      throw new Error(`Token exchange failed: ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    const { id_token, access_token } = tokenData;

    // Decode ID token to get user claims (simplified - in production verify signature)
    const [, payloadB64] = id_token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());
    console.log("[OIDC] User claims:", payload);

    // Find or create user in our system
    const user = await findOrCreateUser(payload);
    console.log("[OIDC] User resolved:", user.id);

    // Ensure user has tenant/workspace membership
    const { tenant, workspace } = await ensureUserMembership(user.id);
    if (!tenant || !workspace) {
      throw new Error("Failed to resolve tenant/workspace for user");
    }

    // Create session in database
    const sessionRepository = getSessionRepositoryPostgres();
    const sessionId = newSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session: SessionAggregate = {
      id: sessionId,
      userId: user.id,
      workspaceId: workspace.id,
      tenantId: tenant.id,
      actorId: user.id,
      productId: "lawyershub",
      actorLabel: user.displayName,
      isAgent: false,
      revokedAt: null,
      issuedAt: now,
      createdAt: now,
      expiresAt: expiresAt,
      updatedAt: now,
    };

    await sessionRepository.create(session);
    console.log("[OIDC] Session created:", sessionId);

    // Create workspace session cookie (same as regular login flow)
    const workspaceSession: WorkspaceSession = {
      sessionId: sessionId,
      tenantId: tenant.id,
      workspaceId: workspace.id,
      actorId: user.id,
      actorLabel: user.displayName,
      productId: "lawyershub",
      issuedAt: now.toISOString(),
    };

    // Clear OIDC cookies
    const response = NextResponse.redirect("/workspace");
    cookieStore.delete("oidc_state");
    cookieStore.delete("oidc_code_verifier");

    // Set workspace session cookie
    response.cookies.set(WORKSPACE_SESSION_COOKIE, encodeWorkspaceSession(workspaceSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;

  } catch (error) {
    console.error("[OIDC] Callback processing failed:", error);
    return NextResponse.redirect("/login?error=oidc_processing_failed");
  }
}