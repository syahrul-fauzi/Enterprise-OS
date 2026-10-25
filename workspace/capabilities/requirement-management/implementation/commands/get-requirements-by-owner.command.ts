import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { RequirementRepositoryCurrent } from "../repository/index.js";
import type { RequirementAggregate } from "../contracts/index.ts";
import { validateBoundaryAccess, validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary } from "../../../work-core/implementation/contracts/work.contracts.ts";

export const GetRequirementsByOwnerInputSchema = z.object({
  ownerId: z.string().min(1),
  productId: z.string().min(1).default("academic"),
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export type GetRequirementsByOwnerInput = z.infer<typeof GetRequirementsByOwnerInputSchema>;

export type GetRequirementsByOwnerOutput = readonly {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: string;
  readonly author?: { name: string };
  readonly createdAt: string;
  readonly updatedAt: string;
}[] | undefined;

export const getRequirementsByOwnerCommand: CapabilityCommand = {
  kind: "command",
  name: "requirement.getByOwner",
  version: "2.1.0",
  capability: "requirement-management",
  async execute(input: unknown) {
    const parsed = GetRequirementsByOwnerInputSchema.parse(input);
    const { ownerId, productId, tenantId, actorId, workspaceId } = parsed;

    // 6-boundary compliance validation
    if (!validateBoundaryAccess("requirement-management", "requirement-management")) {
      throw new Error("Boundary access denied: requirement-management cannot access requirement-management domain (internal check failed)");
    }

    const identityBoundary: IdentityBoundary = {
      tenantId,
      organizationId: "requirement-management.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "requirement-management",
      entityType: "Requirement",
      operation: "listByOwner",
      workspaceId
    };

    const authorityBoundary: AuthorityBoundary = {
      requiredPermission: "requirement:read",
      actorId,
      resourceScope: tenantId
    };

    const executionBoundary: ExecutionBoundary = {
      commandName: "requirement.getByOwner",
      capability: "requirement-management",
      timestamp: new Date().toISOString()
    };

    const evidenceBoundary: EvidenceBoundary = {
      eventType: "REQUIREMENTS_ACCESSED",
      actorId,
      workspaceId,
      timestamp: new Date().toISOString()
    };

    const presentationBoundary: PresentationBoundary = {
      surface: "api",
      clientVersion: "1.0"
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
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const allRequirements = await RequirementRepositoryCurrent.list();
    const ownerRequirements = allRequirements
      .filter((req: RequirementAggregate) => req.owner === ownerId)
      .map((req: RequirementAggregate) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        status: req.status,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      }));

    return ownerRequirements;
  },
};