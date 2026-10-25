import { z } from "zod";
import { randomUUID } from "node:crypto";
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts.js";
import { WORKSPACE_SESSION_COOKIE, encodeWorkspaceSession, type WorkspaceSession } from "../../../../packages/core/kernel/src/index.js";
import { slugifyForTenant } from "../services/password.service.js";
import {
  UserId,
  TenantId,
  WorkspaceId,
  MembershipId,
  SessionId,
} from "@repo/contracts-core";
import { passwordService } from "../services/password.service.js";
import {
  getUserRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getSessionRepositoryPostgres,
  initIdentitySchema,
  UserRepositoryInMemory,
  SessionRepositoryInMemory,
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
} from "../repositories/index.js";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function newUserId(): UserId { return UserId(`user-${randomUUID()}`); }
function newTenantId(): TenantId { return TenantId(`tenant-${randomUUID()}`); }
function newWorkspaceId(): WorkspaceId { return WorkspaceId(`workspace-${randomUUID()}`); }
function newMembershipId(): MembershipId { return MembershipId(`membership-${randomUUID()}`); }
function newSessionId(): SessionId { return SessionId(`session-${randomUUID()}`); }

// EOS PROD-005 (SCALE-001 mandate): Enforce PostgreSQL persistence in production
// In-memory repositories only allowed for isolated development/testing or when EOS_SANDBOX_MODE is enabled
if (process.env.NODE_ENV === "production" && !(process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) && process.env.EOS_SANDBOX_MODE !== "true") {
  throw new Error("[IdentityService] PRODUCTION SAFETY VIOLATION: In-memory repositories cannot be used in production. POSTGRES_CONNECTION_STRING or DATABASE_URL must be set to activate PostgreSQL persistence with RLS tenant isolation.");
}

// P1-CAP-016: Lazy repository initialization untuk menghindari module cycle dan kompatibel Edge Runtime
function getRepositories() {
  const hasDbConnection = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  return {
    userRepo: hasDbConnection ? getUserRepositoryPostgres() : UserRepositoryInMemory,
    tenantRepo: hasDbConnection ? getTenantRepositoryPostgres() : TenantRepositoryInMemory,
    workspaceRepo: hasDbConnection ? getWorkspaceRepositoryPostgres() : WorkspaceRepositoryInMemory,
    membershipRepo: hasDbConnection ? getMembershipRepositoryPostgres() : MembershipRepositoryInMemory,
    sessionRepo: hasDbConnection ? getSessionRepositoryPostgres() : SessionRepositoryInMemory,
  };
}

export const SignupAndSessionInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  productId: z.enum(["lawyershub", "services-id", "ilc", "academic"]).default("lawyershub"),
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

type ActorContext = {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly productId?: string;
};

export const signupAndSessionCommand: SignupAndSessionCommand = {
  kind: "command",
  name: "identity.signupAndCreateSession",
  version: "4.0.0",

  async execute(input: SignupAndSessionInput & { actorContext?: ActorContext }) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.signupAndCreateSession] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    
    }

    if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
      await initIdentitySchema();
    }

    const parsed = SignupAndSessionInputSchema.parse(input);
    const { email, password, displayName, productId = "lawyershub" } = parsed;

    const { userRepo, tenantRepo, workspaceRepo, membershipRepo, sessionRepo } = getRepositories();
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await userRepo.byEmail(trimmedEmail);
    if (existingUser !== undefined) {
      throw new Error(`[identity.signupAndCreateSession] Email already registered: ${trimmedEmail}`);
    }

    const userEntity: any = {
      id: newUserId(),
      email: trimmedEmail,
      displayName: displayName.trim(),
      passwordHash: passwordService.hash(password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await userRepo.save(userEntity);

    const emailLocalPart = email.split("@")[0] ?? displayName;
    const slugBase = slugifyForTenant(`${displayName}-${emailLocalPart}`);
    let slug = slugBase;
    let counter = 1;
    let existingSlug = await tenantRepo.bySlug(slug);
    while (existingSlug !== undefined) {
      counter += 1;
      slug = `${slugBase}-${counter}`;
      existingSlug = await tenantRepo.bySlug(slug);
    }

    const tenantEntity: any = {
      id: newTenantId(),
      name: `${displayName} Personal`,
      slug,
      ownerId: userEntity.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await tenantRepo.save(tenantEntity);

    const workspaceSlugBase = slugifyForTenant("Professional Workspace");
    const workspaceEntity: any = {
      id: newWorkspaceId(),
      tenantId: tenantEntity.id,
      name: "Professional Workspace",
      slug: workspaceSlugBase,
      productId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await workspaceRepo.save(workspaceEntity);

    const membershipEntity: any = {
      id: newMembershipId(),
      userId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      role: "owner",
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await membershipRepo.save(membershipEntity);

    const ttl = DEFAULT_SESSION_TTL_SECONDS;
    const now = new Date();
    const expires = new Date(now.getTime() + ttl * 1000);
    const sessionEntity: any = {
      id: newSessionId(),
      userId: userEntity.id,
      actorId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      productId,
      actorLabel: displayName,
      isAgent: false,
      issuedAt: now,
      expiresAt: expires,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await sessionRepo.save(sessionEntity);

    // Log audit untuk tracing actorContext jika disediakan
    if (input.actorContext) {
      console.log(`[identity.signupAndCreateSession] Signup flow initiated by actor ${input.actorContext.actorId} in workspace ${input.actorContext.workspaceId}, tenant ${input.actorContext.tenantId} for email: ${input.email}`);
    }

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
        actorContext: input.actorContext,
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
          issuedAt: (sessionEntity.issuedAt ?? new Date()).toISOString(),
        } as WorkspaceSession),
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: DEFAULT_SESSION_TTL_SECONDS,
        }
      }]
    };
  },
};