import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  UserId,
  TenantId,
  WorkspaceId,
  MembershipId,
  type UserAggregate,
  type TenantAggregate,
  type WorkspaceAggregate,
  type MembershipAggregate,
} from "../contracts/identity.contracts.js";
import { passwordService, slugifyForTenant } from "../services/password.service.js";
import {
  getUserRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getMembershipRepositoryPostgres,
} from "../repositories/index.js";
import { initIdentitySchema } from "../repositories/base.repository.js";

function newUserId(): UserId {
  return UserId(`user-${randomUUID()}`);
}

function newTenantId(): TenantId {
  return TenantId(`tenant-${randomUUID()}`);
}

function newWorkspaceId(): WorkspaceId {
  return WorkspaceId(`workspace-${randomUUID()}`);
}

function newMembershipId(): MembershipId {
  return MembershipId(`membership-${randomUUID()}`);
}



export const SignupFlowInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  productId: z.string().default("lawyershub"),
});

export type SignupFlowCommand = CapabilityCommand<
  z.infer<typeof SignupFlowInputSchema>,
  {
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly membershipId: string;
    readonly actorId: string;
    readonly actorLabel: string;
    readonly email: string;
  }
>;

export const signupFlowCommand: SignupFlowCommand = {
  kind: "command",
  name: "identity.signupFlow",
  version: "1.0.0",

  async execute(input) {
    await initIdentitySchema();
    const parsed = SignupFlowInputSchema.parse(input);
    const { email, password, displayName, productId } = parsed;
    
    // 1. Create user (PostgreSQL persistent)
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await getUserRepositoryPostgres().byEmail(trimmedEmail);
    if (existingUser !== undefined) {
      throw new Error(`[identity.signupFlow] Email already registered: ${trimmedEmail}`);
    }
    
    const userEntity: UserAggregate = {
      id: newUserId(),
      email: trimmedEmail,
      displayName: displayName.trim(),
      passwordHash: passwordService.hash(password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await getUserRepositoryPostgres().save(userEntity);

    // 2. Generate and handle tenant slug collision (PostgreSQL check)
    const emailLocalPart = email.split("@")[0] ?? displayName;
    const slugBase = slugifyForTenant(`${displayName}-${emailLocalPart}`);
    let slug = slugBase;
    let counter = 1;
    let existingSlug = await getTenantRepositoryPostgres().bySlug(slug);
    while (existingSlug !== undefined) {
      counter += 1;
      slug = `${slugBase}-${counter}`;
      existingSlug = await getTenantRepositoryPostgres().bySlug(slug);
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
    const workspaceEntity: WorkspaceAggregate = {
      id: newWorkspaceId(),
      tenantId: tenantEntity.id,
      name: "Professional Workspace",
      slug: slugifyForTenant("Professional Workspace"),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await MembershipRepositoryPostgres.save(membershipEntity);

    return {
      userId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      membershipId: membershipEntity.id,
      actorId: userEntity.id,
      actorLabel: userEntity.displayName,
      email: userEntity.email,
    };
  },
};