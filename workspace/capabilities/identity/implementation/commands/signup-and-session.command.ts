import { z } from "zod";
import { randomUUID } from "node:crypto";
import { WORKSPACE_SESSION_COOKIE, encodeWorkspaceSession, type WorkspaceSession } from "@repo/core-kernel";
import { slugifyForTenant } from "../services/password.service";
import {
  UserId,
  TenantId,
  WorkspaceId,
  MembershipId,
  SessionId,
  type UserAggregate,
  type TenantAggregate,
  type WorkspaceAggregate,
  type MembershipAggregate,
  type SessionAggregate,
} from "../contracts/identity.contracts";
import { passwordService } from "../services/password.service";
import {
  UserRepositoryPostgres,
  TenantRepositoryPostgres,
  WorkspaceRepositoryPostgres,
  MembershipRepositoryPostgres,
  SessionRepositoryPostgres,
} from "../repositories";
import { initIdentitySchema } from "../repositories/base.repository";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// Factory functions for generating unique IDs
function newUserId(): UserId { return UserId(`user-${randomUUID()}`); }
function newTenantId(): TenantId { return TenantId(`tenant-${randomUUID()}`); }
function newWorkspaceId(): WorkspaceId { return WorkspaceId(`workspace-${randomUUID()}`); }
function newMembershipId(): MembershipId { return MembershipId(`membership-${randomUUID()}`); }
function newSessionId(): SessionId { return SessionId(`session-${randomUUID()}`); }

// Signup input schema (matches API requirements)
export const SignupAndSessionInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  productId: z.string().default("services-id.default"),
});

export type SignupAndSessionInput = z.infer<typeof SignupAndSessionInputSchema>;

export type SignupAndSessionOutput = {
  readonly response: {
    ok: true;
    authenticated: boolean;
    userId: string;
    actorId: string;
    actorLabel: string;
    email: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    workspaceId: string;
    workspaceName: string;
    membershipId: string;
    sessionId: string;
    role: string;
    records: Array<{ ok: boolean; commandKey: string }>;
  };
  readonly cookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>;
};

export type SignupAndSessionCommand = {
  kind: "command";
  name: string;
  version: string;
  execute: (input: SignupAndSessionInput) => Promise<SignupAndSessionOutput>;
};

export const signupAndSessionCommand: SignupAndSessionCommand = {
  kind: "command",
  name: "identity.signupAndCreateSession",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input: SignupAndSessionInput) {
    // Initialize database schema first
    await initIdentitySchema();
    
    const parsed = SignupAndSessionInputSchema.parse(input);
    const { email, password, displayName, productId = "services-id.default" } = parsed;

    // 1. Create user (PostgreSQL persistent)
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await UserRepositoryPostgres.byEmail(trimmedEmail);
    if (existingUser !== undefined) {
      throw new Error(`[identity.signupAndCreateSession] Email already registered: ${trimmedEmail}`);
    }

    const userEntity: UserAggregate = {
      id: newUserId(),
      email: trimmedEmail,
      displayName: displayName.trim(),
      passwordHash: passwordService.hash(password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await UserRepositoryPostgres.save(userEntity);

    // 2. Generate unique tenant slug (PostgreSQL check)
    const emailLocalPart = email.split("@")[0] ?? displayName;
    const slugBase = slugifyForTenant(`${displayName}-${emailLocalPart}`);
    let slug = slugBase;
    let counter = 1;
    let existingSlug = await TenantRepositoryPostgres.bySlug(slug);
    while (existingSlug !== undefined) {
      counter += 1;
      slug = `${slugBase}-${counter}`;
      existingSlug = await TenantRepositoryPostgres.bySlug(slug);
    }

    // 3. Create tenant (PostgreSQL persistent)
    const tenantEntity: TenantAggregate = {
      id: newTenantId(),
      name: `${displayName} Personal`,
      slug,
      ownerId: userEntity.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await TenantRepositoryPostgres.save(tenantEntity);

    // 4. Create workspace (PostgreSQL persistent)
    const workspaceSlugBase = slugifyForTenant("Professional Workspace");
    const workspaceEntity: WorkspaceAggregate = {
      id: newWorkspaceId(),
      tenantId: tenantEntity.id,
      name: "Professional Workspace",
      slug: workspaceSlugBase,
      productId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await WorkspaceRepositoryPostgres.save(workspaceEntity);

    // 5. Create membership (PostgreSQL persistent)
    const membershipEntity: MembershipAggregate = {
      id: newMembershipId(),
      userId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      role: "owner",
      joinedAt: new Date(),
      updatedAt: new Date(),
    };
    await MembershipRepositoryPostgres.save(membershipEntity);

    // 6. Create session (PostgreSQL persistent)
    const ttl = DEFAULT_SESSION_TTL_SECONDS;
    const now = new Date();
    const expires = new Date(now.getTime() + ttl * 1000);
    const sessionEntity: SessionAggregate = {
      id: newSessionId(),
      userId: userEntity.id,
      actorId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      productId,
      actorLabel: displayName,
      issuedAt: now,
      expiresAt: expires,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await SessionRepositoryPostgres.save(sessionEntity);

    // 7. Format HTTP response + cookie configuration
    return {
      response: {
        ok: true,
        authenticated: true,
        userId: userEntity.id,
        actorId: userEntity.id,
        actorLabel: userEntity.displayName,
        email: userEntity.email,
        tenantId: tenantEntity.id,
        tenantName: tenantEntity.name,
        tenantSlug: tenantEntity.slug,
        workspaceId: workspaceEntity.id,
        workspaceName: workspaceEntity.name,
        membershipId: membershipEntity.id,
        sessionId: sessionEntity.id,
        role: membershipEntity.role,
        records: [
          { ok: true, commandKey: "identity.registerUser" },
          { ok: true, commandKey: "identity.createTenant" },
          { ok: true, commandKey: "identity.createWorkspace" },
          { ok: true, commandKey: "identity.createMembership" },
        ],
      },
      cookies: [{
        name: WORKSPACE_SESSION_COOKIE,
        value: encodeWorkspaceSession({
          sessionId: sessionEntity.id,
          actorId: userEntity.id,
          actorLabel: userEntity.displayName,
          tenantId: tenantEntity.id,
          workspaceId: workspaceEntity.id,
          productId,
          issuedAt: sessionEntity.issuedAt.toISOString(),
        } as WorkspaceSession),
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        }
      }]
    };
  },
};