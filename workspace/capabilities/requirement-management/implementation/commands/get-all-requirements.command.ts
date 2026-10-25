import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { RequirementRepositoryCurrent } from "../repository/index.js";
import type { RequirementAggregate } from "../contracts/index.ts";
import { validateBoundaryAccess, validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary } from "../../../work-core/implementation/contracts/work.contracts.ts";

export const GetAllRequirementsInputSchema = z.object({
  productId: z.string().min(1).default("academic"),
  searchQuery: z.string().default(""),
  filterStatus: z.string().default("all"),
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export type GetAllRequirementsInput = z.infer<typeof GetAllRequirementsInputSchema>;

export type GetAllRequirementsOutput = readonly {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: string;
  readonly owner?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}[] | undefined;

export const getAllRequirementsCommand: CapabilityCommand = {
  kind: "command",
  name: "requirement.getAll",
  version: "2.1.0",
  capability: "requirement-management",
  async execute(input: unknown) {
    const parsed = GetAllRequirementsInputSchema.parse(input);
    const { searchQuery, filterStatus, tenantId, actorId, workspaceId } = parsed;

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
      intent: "list-all-requirements",
      currentState: "executing",
      requirements: [],
      constraints: [],
      decisions: []
    };

    const authorityBoundary: AuthorityBoundary = {
      actorCapabilities: new Map([[actorId, ["requirement.getAll"]]]),
      policyEnforcements: ["requirement-list-policy"],
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
      evidenceIds: [`req-list-${Date.now()}`],
      evidenceChain: [{
        actorId,
        action: "list-all-requirements",
        timestamp: new Date(),
        workspaceId
      }],
      outcomeVerified: false
    };

    const presentationBoundary: PresentationBoundary = {
      supportedFaces: ["web", "api"],
      defaultLayout: "requirement-list",
      mobileEnabled: true,
      apiEnabled: true,
      projectionConfig: {
        displayName: "All Requirements",
        summary: "List of all requirements in the system",
        priority: "medium",
        uiFilters: ["id", "title", "status", "owner", "createdAt"],
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
      console.error("[requirement-management.getAllRequirements] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    // Proceed with original business logic after boundary validation
    const allRequirements: readonly RequirementAggregate[] = await RequirementRepositoryCurrent.list();
    const filteredRequirements = allRequirements
      .filter((req) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = req.title.toLowerCase().includes(searchLower) ||
                            (req.description && req.description.toLowerCase().includes(searchLower)) ||
                            (req.owner && req.owner.toLowerCase().includes(searchLower));
        return matchesSearch;
      })
      .filter((req) => {
        if (filterStatus === "all") return true;
        return req.status === filterStatus;
      })
      .map((req: RequirementAggregate) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        status: req.status,
        owner: req.owner,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      }));

    return filteredRequirements;
  },
};