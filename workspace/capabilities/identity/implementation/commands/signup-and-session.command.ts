import { z } from "zod";
import { randomUUID } from "node:crypto";
import { WORKSPACE_SESSION_COOKIE, encodeWorkspaceSession, type WorkspaceSession } from "@repo/core-kernel";
import { slugifyForTenant } from "../services/password.service.js";
import {
  UserId,
  TenantId,
  WorkspaceId,
  MembershipId,
  SessionId,
} from "../contracts/identity.contracts.js";
import { passwordService } from "../services/password.service";
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
} from "@capabilities/identity/implementation/repositories";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function newUserId(): UserId { return UserId(`user-${randomUUID()}`); }
function newTenantId(): TenantId { return TenantId(`tenant-${randomUUID()}`); }
function newWorkspaceId(): WorkspaceId { return WorkspaceId(`workspace-${randomUUID()}`); }
function newMembershipId(): MembershipId { return MembershipId(`membership-${randomUUID()}`); }
function newSessionId(): SessionId { return SessionId(`session-${randomUUID()}`); }

const userRepo = process.env.DATABASE_URL
  ? getUserRepositoryPostgres()
  : UserRepositoryInMemory;
const tenantRepo = process.env.DATABASE_URL
  ? getTenantRepositoryPostgres()
  : TenantRepositoryInMemory;
const workspaceRepo = process.env.DATABASE_URL
  ? getWorkspaceRepositoryPostgres()
  : WorkspaceRepositoryInMemory;
const membershipRepo = process.env.DATABASE_URL
  ? getMembershipRepositoryPostgres()
  : MembershipRepositoryInMemory;
const sessionRepo = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

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

export const signupAndSessionCommand: SignupAndSessionCommand = {
  kind: "command",
  name: "identity.signupAndCreateSession",
  version: "2.0.0",

  async execute(input: SignupAndSessionInput) {
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }

    const parsed = SignupAndSessionInputSchema.parse(input);
    const { email, password, displayName, productId = "lawyershub" } = parsed;

    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await userRepo.byEmail(trimmedEmail);
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

    const tenantEntity: TenantAggregate = {
      id: newTenantId(),
      name: `${displayName} Personal`,
      slug,
      ownerId: userEntity.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await tenantRepo.save(tenantEntity);

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
    await workspaceRepo.save(workspaceEntity);

    const membershipEntity: MembershipAggregate = {
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
    const sessionEntity: SessionAggregate = {
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
          issuedAt: (sessionEntity.issuedAt ?? new Date()).toISOString(),
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