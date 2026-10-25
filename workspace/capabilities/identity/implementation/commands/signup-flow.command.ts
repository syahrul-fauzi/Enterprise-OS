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
} from "@repo/contracts-core";
import { passwordService, slugifyForTenant } from "../services/password.service.js";
import {
  getUserRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getMembershipRepositoryPostgres,
  UserRepositoryInMemory,
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
} from "../repositories/index.js";
import { validateBoundaryAccess } from '../../../../work-core/implementation/contracts/work.contracts.js';

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

  async execute(input: z.infer<typeof SignupFlowInputSchema>) {
    // P1-CAP-017: 6-boundary compliance validation - identity domain can only access itself
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[signup-flow] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }
    
    const { userRepository, tenantRepository, workspaceRepository, membershipRepository } = getRepositories();
    
    const parsed = SignupFlowInputSchema.parse(input);
    const { email, password, displayName, productId } = parsed;

    // 1. Validate no existing user
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await userRepository.byEmail(trimmedEmail);
    if (existingUser !== undefined) {
      throw new Error(`[identity.signupFlow] Email already registered: ${trimmedEmail}`);
    }

    // Define entities, will be instantiated during the transaction
    let userEntity: UserAggregate;
    let tenantEntity: TenantAggregate;
    let workspaceEntity: WorkspaceAggregate;
    let membershipEntity: MembershipAggregate;

    // Transactional creation with cleanup on failure
    try {
      const tenantId = newTenantId();
      // 1. Create User
      userEntity = {
        id: newUserId(),
        email: trimmedEmail,
        displayName: displayName.trim(),
        passwordHash: passwordService.hash(password),
        tenantId: tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepository.save(userEntity);

      try {
        // 2. Generate unique slug and create Tenant
        const emailLocalPart = email.split("@")[0] ?? displayName;
        const slugBase = slugifyForTenant(`${displayName}-${emailLocalPart}`);
        let slug = slugBase;
        let counter = 1;
        let existingSlug = await tenantRepository.bySlug(slug);
        while (existingSlug !== undefined) {
          counter += 1;
          slug = `${slugBase}-${counter}`;
          existingSlug = await tenantRepository.bySlug(slug);
        }
        
        tenantEntity = {
          id: tenantId,
          name: `${displayName} Personal`,
          slug: slug,
          ownerId: userEntity.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await tenantRepository.save(tenantEntity);

        try {
          // 3. Create Workspace
          workspaceEntity = {
            id: newWorkspaceId(),
            tenantId: tenantEntity.id,
            name: "Professional Workspace",
            slug: slugifyForTenant("Professional Workspace"),
            productId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await workspaceRepository.save(workspaceEntity);

          try {
            // 4. Create Membership
            membershipEntity = {
              id: newMembershipId(),
              userId: userEntity.id,
              tenantId: tenantEntity.id,
              workspaceId: workspaceEntity.id,
              role: "owner",
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await membershipRepository.save(membershipEntity);
          } catch (membershipError) {
            console.error("Signup Flow: Step 4 (Membership) failed. Rolling back 3, 2, 1.", membershipError);
            await workspaceRepository.remove(workspaceEntity.id);
            await tenantRepository.remove(tenantEntity.id);
            await userRepository.remove(userEntity.id);
            throw membershipError;
          }
        } catch (workspaceError) {
          console.error("Signup Flow: Step 3 (Workspace) failed. Rolling back 2, 1.", workspaceError);
          await tenantRepository.remove(tenantEntity.id);
          await userRepository.remove(userEntity.id);
          throw workspaceError;
        }
      } catch (tenantError) {
        console.error("Signup Flow: Step 2 (Tenant) failed. Rolling back 1.", tenantError);
        await userRepository.remove(userEntity.id);
        throw tenantError;
      }
    } catch (userError) {
      console.error("Signup Flow: Step 1 (User) failed. No rollback needed.", userError);
      throw userError;
    }

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

// P1-CAP-017: Lazy repository initialization untuk menghindari module cycle dan kompatibel Edge Runtime
function getRepositories() {
  const hasDbConnection = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  return {
    userRepository: hasDbConnection ? getUserRepositoryPostgres() : UserRepositoryInMemory,
    tenantRepository: hasDbConnection ? getTenantRepositoryPostgres() : TenantRepositoryInMemory,
    workspaceRepository: hasDbConnection ? getWorkspaceRepositoryPostgres() : WorkspaceRepositoryInMemory,
    membershipRepository: hasDbConnection ? getMembershipRepositoryPostgres() : MembershipRepositoryInMemory,
  };
}