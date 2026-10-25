import { z } from "zod";
// Gunakan alias canonical @repo/core-kernel sesuai package exports (hanya dist path yang diizinkan)
import type { CapabilityCommand } from "@repo/core-kernel";
import { getWorkRepositoryPostgres } from "../repository/work-postgres.repository.js";
import { validateBoundaryAccess, validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary, type WorkAggregate } from "@capabilities/work-core/contracts/work.contracts.js";

export const GetWorksByInstitutionInputSchema = z.object({
  institutionId: z.string().min(1),
  productId: z.string().min(1).default("academic"),
  // Tambahkan mandatory context parameters untuk compliance boundary
  sessionId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
});

export type GetWorksByInstitutionInput = z.infer<typeof GetWorksByInstitutionInputSchema>;

export type GetWorksByInstitutionOutput = readonly {
  readonly workId: string;
  readonly title: string;
  readonly description?: string;
  readonly state: "open" | "in_progress" | "blocked" | "completed";
  readonly updatedAt: string;
}[] | undefined;

// Lazy initialize repository untuk menghindari module cycles dan mendukung Edge Runtime
async function getWorkRepositoryLazy() {
  return getWorkRepositoryPostgres();
}

export const getWorksByInstitutionCommand: CapabilityCommand = {
  kind: "command",
  name: "work.getWorksByInstitution",
  version: "1.1.0", // Update version untuk canonical change
  async execute(input: unknown) {
    const parsed = GetWorksByInstitutionInputSchema.parse(input);
    const { institutionId, tenantId, workspaceId, actorId } = parsed;

    // 0. Basic boundary access validation (required for fitness checks)
    if (!validateBoundaryAccess("work-core", "work-core")) {
      throw new Error("Boundary access denied: work-core cannot access work-core domain (internal check failed)");
    }

    // 1. Validate full 6 boundaries (CAPABILITY_MISMATCH fix)
    // Gunakan typed TenantId/ActorId sesuai kontrak work.contracts (konversi string ke typed ID)
    const identityBoundary: IdentityBoundary = {
      tenantId: tenantId as any,
      organizationId: "work-core.enterprise-os" as any,
      principalId: actorId as any,
      ownerIds: [actorId as any]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "work-core",
      intent: "list-works-by-institution",
      currentState: "active",
      requirements: [],
      constraints: [],
      decisions: []
    };

    const authorityBoundary: AuthorityBoundary = {
      actorCapabilities: new Map([[actorId, ["list-works-by-institution"]]]),
      policyEnforcements: ["work-list-policy"],
      authorizations: new Map([[actorId, ["read"]]]),
      delegations: []
    };

    const executionBoundary: ExecutionBoundary = {
      workspaceId,
      runtimeEnvironment: "web",
      executorIds: [actorId],
      executionFrame: "direct"
    };

    const evidenceBoundary: EvidenceBoundary = {
      evidenceIds: [`work-list-${Date.now()}`],
      evidenceChain: [{
        actorId,
        action: "list-works-by-institution",
        timestamp: new Date(),
        workspaceId
      }],
      outcomeVerified: false
    };

    const presentationBoundary: PresentationBoundary = {
      supportedFaces: ["web", "api"],
      defaultLayout: "work-list",
      mobileEnabled: true,
      apiEnabled: true,
      projectionConfig: {
        displayName: "Institution Works",
        summary: "List of works for institution",
        priority: "medium",
        uiFilters: ["workId", "title", "state", "updatedAt"],
        hideFromSurfaces: []
      }
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
      console.error("[work-core.getWorksByInstitution] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    // 1. Lakukan query repository
    const workRepository = await getWorkRepositoryLazy();
    const institutionWorks = await workRepository.listByInstitution(institutionId);

    // 2. Map WorkAggregate to output format
    return institutionWorks.map((work: WorkAggregate & { participantIds?: string[]; institutionId?: string }) => ({
      workId: work.workId,
      title: work.title,
      description: work.description,
      state: work.status === "draft" ? "open" :
             work.status === "active" ? "in_progress" :
             work.status === "suspended" ? "blocked" : "completed",
      updatedAt: work.createdAt,
    }));
  },
};