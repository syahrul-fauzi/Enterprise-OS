import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/index.js";
import { UserRepositoryPostgres } from "../repositories/index.js";
import type { UserId } from "@repo/contracts-core";
// Import canonical boundary validation utilities from work-core (Rule of Two compliance)
import { validateBoundaryAccess, validateAllBoundaries } from "@capabilities/work-core/contracts/work.contracts.js";
import type { IdentityBoundary, SemanticBoundary, AuthorityBoundary, ExecutionBoundary, EvidenceBoundary, PresentationBoundary } from "@capabilities/work-core/contracts/work.contracts.js";

export const GetMemberByIdInputSchema = z.object({
  memberId: z.string().min(1),
  actorContext: z.object({
    actorId: z.string().optional(),
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    productId: z.string().optional(),
  }).optional(),
});

export type GetMemberByIdInput = z.infer<typeof GetMemberByIdInputSchema>;

export type GetMemberByIdOutput = {
  readonly type: "researcher" | "professor" | "institution";
  readonly id: string;
  readonly name: string;
  readonly affiliation?: string;
  readonly location?: string;
  readonly researchFocus?: string;
  readonly publicationCount?: number;
  readonly researcherCount?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly actorContext?: z.infer<typeof GetMemberByIdInputSchema.shape.actorContext>;
} | undefined;

export const getMemberByIdCommand: CapabilityCommand<GetMemberByIdInput, GetMemberByIdOutput> = {
  kind: "command",
  name: "identity.getMemberById",
  version: "3.0.0", // Updated for full 6-boundary compliance and canonical actorContext support
  async execute(input: GetMemberByIdInput) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.getMemberById] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // 2. Parse input dan ekstrak actorContext (canonical pattern)
    const parsed = GetMemberByIdInputSchema.parse(input);
    const { memberId } = parsed;
    
    // Extract context dari actorContext (mematuhi invariant "Workspace bukan identitas/authority")
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "unknown-actor";
    const tenantId = input.actorContext?.tenantId || "unknown-tenant";

    // Log audit untuk tracing actorContext jika disediakan (wajib compliance audit)
    if (input.actorContext) {
      console.log(`[identity.getMemberById] Member lookup initiated by actor ${actorId} in workspace ${workspaceId}, tenant ${tenantId} for member ID: ${memberId}`);
    }

    // Enforce 6-boundary compliance (user mandate: IDENTITY/SEMANTIC/AUTHORITY/EXECUTION/EVIDENCE/PRESENTATION)
    // Extract context dari actorContext yang sudah didefinisikan (canonical pattern)

    // Build boundary objects untuk validasi
    const identityBoundary: IdentityBoundary = {
      tenantId,
      organizationId: "identity.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "identity",
      intent: "get-member-by-id",
      currentState: "executing"
    };

    const authorityBoundary: AuthorityBoundary = {
      allowedActions: ["read"],
      restrictedFields: [],
      requesterId: actorId,
      resourceOwnerId: memberId
    };

    const executionBoundary: ExecutionBoundary = {
      workspaceId,
      runtimeEnvironment: process.env.NODE_ENV || "development",
      executionId: `get-member-${Date.now()}`,
      propagatedFrom: "api-route"
    };

    const evidenceBoundary: EvidenceBoundary = {
      evidenceRequired: true,
      evidenceRetentionPeriod: "90d",
      auditLogEnabled: true
    };

    const presentationBoundary: PresentationBoundary = {
      uiFilters: ["id", "name", "type"],
      hideFromSurfaces: [],
      priority: "low"
    };

    // Validate all boundaries sebelum eksekusi logic utama
    const boundaryValidation = validateAllBoundaries({
      identity: identityBoundary,
      semantic: semanticBoundary,
      authority: authorityBoundary,
      execution: executionBoundary,
      evidence: evidenceBoundary,
      presentation: presentationBoundary
    });

    if (!boundaryValidation.valid) {
      console.error("[identity.getMemberById] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const user = await UserRepositoryPostgres.byId(memberId as unknown as UserId);
    if (user === undefined) {
      return undefined;
    }

    // Transform user aggregate to presentation-ready member format
    const userCreatedAt = user.createdAt ?? new Date();
    const userUpdatedAt = user.updatedAt ?? new Date();
    return {
      type: "researcher", // FIXME: Hardcoded as 'researcher' because UserAggregate no longer has a 'type' property.
      id: memberId,
      name: user.displayName ?? "Unknown",
      affiliation: "Unknown Affiliation", // FIXME: This information is no longer in UserAggregate
      location: "Unknown Location", // FIXME: This information is no longer in UserAggregate
      researchFocus: "Unknown Focus", // FIXME: This information is no longer in UserAggregate
      publicationCount: 0, // FIXME: This information is no longer in UserAggregate
      researcherCount: undefined as number | undefined, // FIXME: This information is no longer in UserAggregate
      createdAt: userCreatedAt.toISOString(),
      updatedAt: userUpdatedAt.toISOString(),
      actorContext: input.actorContext, // Pertahankan actorContext untuk chainability antar command
    };
  },
};