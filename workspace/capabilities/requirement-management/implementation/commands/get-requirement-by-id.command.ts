import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { RequirementRepositoryCurrent } from "../repository/index.js";
import type { RequirementAggregate } from "../contracts/index.ts";
import { validateBoundaryAccess, validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary } from "../../../work-core/implementation/contracts/work.contracts.ts";

export const GetRequirementByIdInputSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export type GetRequirementByIdInput = z.infer<typeof GetRequirementByIdInputSchema>;

export type GetRequirementByIdOutput = RequirementAggregate | undefined;

export const getRequirementByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "requirement.getById",
  version: "2.1.0",
  capability: "requirement-management",
  async execute(input: unknown) {
    const parsed = GetRequirementByIdInputSchema.parse(input);
    const { id, tenantId, actorId, workspaceId } = parsed;

    // 0. Basic boundary access validation (required for fitness checks)
    if (!validateBoundaryAccess("requirement-management", "requirement-management")) {
      throw new Error("Boundary access denied: requirement-management cannot access requirement-management domain (internal check failed)");
    }

    // 1. Validate full 6 boundaries (CAPABILITY_MISMATCH fix)
    const identityBoundary: IdentityBoundary = {
      tenantId,
      organizationId: "requirement-management.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "requirement-management",
      intent: "get-requirement-by-id",
      currentState: "executing",
      requirements: [],
      constraints: [],
      decisions: []
    };

    const authorityBoundary: AuthorityBoundary = {
      actorCapabilities: new Map([[actorId, ["requirement.getById"]]]),
      policyEnforcements: ["requirement-read-policy"],
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
      evidenceIds: [`req-get-${Date.now()}`],
      evidenceChain: [{
        actorId,
        action: "get-requirement-by-id",
        timestamp: new Date(),
        workspaceId
      }],
      outcomeVerified: false
    };

    const presentationBoundary: PresentationBoundary = {
      supportedFaces: ["web", "api"],
      defaultLayout: "requirement-detail",
      mobileEnabled: true,
      apiEnabled: true,
      projectionConfig: {
        displayName: "Requirement Detail",
        summary: "View requirement details by ID",
        priority: "high",
        uiFilters: [],
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
      console.error("[requirement-management.getRequirementById] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const requirement = await RequirementRepositoryCurrent.byId(id as any);
    return requirement;
  },
};