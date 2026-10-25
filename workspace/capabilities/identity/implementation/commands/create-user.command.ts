import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  UserId,
  TenantId,
  ActorId,
  type RegisterUserInput,
  type UserAggregate,
} from "@repo/contracts-core";
// Import 6-boundary contracts untuk compliance (canonical path untuk work-core)
import { 
  validateBoundaryAccess,
  validateAllBoundaries,
  IdentityBoundary,
  SemanticBoundary,
  AuthorityBoundary,
  ExecutionBoundary,
  EvidenceBoundary,
  PresentationBoundary
} from "@capabilities/work-core/contracts/work.contracts.js";
import { passwordService } from "../services/password.service.js";
import { UserRepositoryPostgres } from "../repositories/index.js";

function newUserId(): UserId {
  return UserId(`user-${randomUUID()}`);
}

// Lazy initialize user repository - hindari circular import dan ESM error
let _userRepo: any = undefined;
async function getUserRepositoryLazy() {
  if (!_userRepo) {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (isTestEnvironment && !hasConnectionString) {
      // Gunakan in-memory repository untuk test jika tidak ada koneksi database
      const { UserRepositoryInMemory } = await import("../repositories/user-inmemory.repository.ts");
      _userRepo = new UserRepositoryInMemory();
      console.log("[identity] 🔧 Using IN-MEMORY user repository for TEST environment");
    } else {
      // Gunakan PostgreSQL repository untuk production/dev
      _userRepo = UserRepositoryPostgres;
      console.log("[identity] 🐘 Using POSTGRESQL user repository");
    }
  }
  return _userRepo;
}

type RegisterUserCommand = CapabilityCommand<
  RegisterUserInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string }; userAgent?: string },
  {
    readonly userId: string;
    readonly actorId: string;
    readonly actorLabel: string;
    readonly email: string;
  }
>;

export const createUserCommand: RegisterUserCommand = {
  kind: "command",
  name: "identity.registerUser",
  version: "1.0.0",

  async execute(input) {
    const userRepository = await getUserRepositoryLazy();
    
    // Validasi akses lintas domain terlebih dahulu (6-boundary compliance - identity -> work-core)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[identity.createUser] BOUNDARY ACCESS DENIED: identity domain cannot access work-core directly");
      throw new Error("Boundary access violation: domain identity tidak diizinkan mengakses domain work-core");
    }
    
    // 0. Validate 6 boundaries - CAPABILITY_MISMATCH FIX (sesuai pola canonical)
    const requestTenantId = input.actorContext?.tenantId || input.tenantId || "unknown-tenant";
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "system-actor"; // actor sistem untuk registrasi awal
    
    const identityBoundary: IdentityBoundary = {
      tenantId: requestTenantId,
      organizationId: "identity.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };
    
    const semanticBoundary: SemanticBoundary = {
      domain: "identity",
      intent: "create-new-user",
      currentState: "pending",
      requirements: [],
      constraints: ["email must be unique", "password must be hashed"],
      decisions: []
    };
    
    const authorityBoundary: AuthorityBoundary = {
      canExecute: true,
      authorizedScopes: ["user:create", "identity:manage"],
      deniedScopes: [],
      policyVersion: "1.0.0"
    };
    
    const executionBoundary: ExecutionBoundary = {
      workspaceId,
      runtimeEnvironment: process.env.NODE_ENV || "development",
      executionId: randomUUID(),
      startTime: new Date().toISOString()
    };
    
    const evidenceBoundary: EvidenceBoundary = {
      evidenceChain: [{
        actorId,
        action: "user.created",
        timestamp: new Date().toISOString(),
        metadata: { source: "identity.createUserCommand", email: input.email }
      }],
      evidenceIds: []
    };
    
    const presentationBoundary: PresentationBoundary = {
      surface: "api",
      userAgent: input.userAgent || "unknown",
      clientVersion: "1.0.0"
    };
    
    const boundaryValidation = validateAllBoundaries({
      identity: identityBoundary,
      semantic: semanticBoundary,
      authority: authorityBoundary,
      execution: executionBoundary,
      evidence: evidenceBoundary,
      presentation: presentationBoundary
    });

    if (!boundaryValidation.valid) {
      console.error("[identity.createUser] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    // Lazy initialize repository to avoid circular imports
    const { UserRepositoryPostgres } = await import("../repositories/index.js");
    const userRepository = new UserRepositoryPostgres();
    
    // Create user record
    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      metadata: input.metadata || {},
      createdAt: new Date(),
      createdBy: actorId
    });
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }
};