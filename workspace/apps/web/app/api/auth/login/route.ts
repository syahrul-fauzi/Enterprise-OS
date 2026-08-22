import { NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "node:crypto";
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
} from "../../../../../../capabilities/identity/implementation/repositories/index";
import type { SessionAggregate } from "../../../../../../capabilities/identity/implementation/contracts/identity.contracts";
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const SALT_SEPARATOR = "$";
function scryptDerive(password: string, salt: Buffer): string {
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN) as Buffer;
  return `${salt.toString("hex")}${SALT_SEPARATOR}${derived.toString("hex")}`;
}
function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [saltHex, derivedHex] = storedHash.split(SALT_SEPARATOR);
    if (!saltHex || !derivedHex) return false;
    const saltBuf = Buffer.from(saltHex, "hex");
    const computed = crypto.scryptSync(password, saltBuf, SCRYPT_KEYLEN) as Buffer;
    const expected = Buffer.from(derivedHex, "hex");
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
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
    // REALITY PATH ONLY: Inisialisasi SEMUA setelah schema dibuat
    await initIdentitySchema();
    console.log("[SEED] Schema initialized");
    
    // Inisialisasi repository SETELAH schema dibuat
    const userRepository = getUserRepositoryPostgres();
    const sessionRepository = getSessionRepositoryPostgres();
    const membershipRepository = getMembershipRepositoryPostgres();
    const tenantRepository = getTenantRepositoryPostgres();
    const workspaceRepository = getWorkspaceRepositoryPostgres();
    
    // Seed data logic - PASTIKAN BERJALAN SETIAP KALI JIKA TABEL KOSONG
    const fs = require('fs');
    const path = require('path');
    const usersData = JSON.parse(fs.readFileSync(path.join('/app/data/users.json'), 'utf8'));
    const tenantsData = JSON.parse(fs.readFileSync(path.join('/app/data/tenants.json'), 'utf8'));
    const workspacesData = JSON.parse(fs.readFileSync(path.join('/app/data/workspaces.json'), 'utf8'));
    const membershipsData = JSON.parse(fs.readFileSync(path.join('/app/data/memberships.json'), 'utf8'));

    // Seed users if empty
    const existingUsers = await userRepository.list();
    console.log("[SEED] Existing users count:", existingUsers.length);
    if (existingUsers.length === 0) {
      console.log("[SEED] Inserting users...");
      for (const u of usersData) {
        await userRepository.save({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          passwordHash: u.passwordHash,
          emailVerified: true,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        });
      }
    }
    // Seed tenants if empty
    const existingTenants = await tenantRepository.list();
    console.log("[SEED] Existing tenants count:", existingTenants.length);
    if (existingTenants.length === 0) {
      console.log("[SEED] Inserting tenants...");
      for (const t of tenantsData) {
        await tenantRepository.save({
          id: t.id,
          name: t.name,
          slug: t.slug,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        });
      }
    }
    // Seed workspaces if empty
    const existingWorkspaces = await workspaceRepository.list();
    console.log("[SEED] Existing workspaces count:", existingWorkspaces.length);
    if (existingWorkspaces.length === 0) {
      console.log("[SEED] Inserting workspaces...");
      for (const w of workspacesData) {
        await workspaceRepository.save({
          id: w.id,
          tenantId: w.tenantId,
          name: w.name,
          slug: w.slug,
          productId: w.productId,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt),
        });
      }
    }
    // Seed memberships if empty
    const existingMemberships = await membershipRepository.list();
    console.log("[SEED] Existing memberships count:", existingMemberships.length);
    if (existingMemberships.length === 0) {
      console.log("[SEED] Inserting memberships...");
      for (const m of membershipsData) {
        await membershipRepository.save({
          id: m.id,
          userId: m.userId,
          tenantId: m.tenantId,
          workspaceId: m.workspaceId,
          role: m.role,
          joinedAt: new Date(m.joinedAt),
          createdAt: new Date(m.joinedAt),
          updatedAt: new Date(m.updatedAt),
        });
      }
    }
    console.log("[SEED] Seed process completed");

    // REALITY PATH ONLY - Inline login logic langsung di route.ts, pakai method yang BENAR dari repository
    const user = await userRepository.byEmail(email);
    if (!user) {
      console.error("[LOGIN FAIL] User not found:", email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    console.log("[LOGIN DEBUG] User found:", user.id, user.email);
    const passwordValid = verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      console.error("[LOGIN FAIL] Password invalid for:", email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    console.log("[LOGIN DEBUG] Password valid");
    // Find first tenant/membership - membership repository pakai listByUser
    const memberships = await membershipRepository.listByUser(user.id);
    if (memberships.length === 0) {
      console.error("[LOGIN FAIL] No memberships for user:", user.id);
      return NextResponse.json({ error: "No workspaces available" }, { status: 500 });
    }
    const firstMembership = memberships[0];
    console.log("[LOGIN DEBUG] First membership:", firstMembership);
    const tenant = await tenantRepository.byId(firstMembership.tenantId);
    if (!tenant) {
      console.error("[LOGIN FAIL] Tenant not found:", firstMembership.tenantId);
      return NextResponse.json({ error: "Tenant not found" }, { status: 500 });
    }
    console.log("[LOGIN DEBUG] Tenant found:", tenant.id, tenant.name);
    const workspace = await workspaceRepository.byId(firstMembership.workspaceId);
    if (!workspace) {
      console.error("[LOGIN FAIL] Workspace not found:", firstMembership.workspaceId);
      return NextResponse.json({ error: "No workspaces found" }, { status: 500 });
    }
    console.log("[LOGIN DEBUG] Workspace found:", workspace.id, workspace.name);
    // Create new session - pakai method save dari repository
    const sessionId = newSessionId();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000); // 1 hari
    await sessionRepository.save({
      id: sessionId,
      userId: user.id,
      actorId: user.id,
      tenantId: tenant.id,
      workspaceId: workspace.id,
      productId: workspace.productId || "lawyershub.default",
      actorLabel: user.displayName,
      isAgent: false,
      issuedAt,
      expiresAt,
      revokedAt: null,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    } as SessionAggregate);
    console.log("[LOGIN SUCCESS] Session created:", sessionId);

    const session: WorkspaceSession = {
      sessionId: sessionId,
      actorId: user.id,
      actorLabel: user.displayName || "User",
      tenantId: tenant.id,
      workspaceId: workspace.id,
      productId: "services-id.default",
      issuedAt: new Date().toISOString(),
      userId: user.id,
    } as WorkspaceSession;

    const response = NextResponse.json(
      {
        ok: true,
        authenticated: true,
        actorId: session.actorId,
        actorLabel: session.actorLabel,
        userId: user.id,
        tenantId: tenant.id,
        workspaceId: workspace.id,
        productId: session.productId,
        sessionId: sessionId,
        redirectUrl: `/${tenant.slug}/${workspace.slug}`,
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