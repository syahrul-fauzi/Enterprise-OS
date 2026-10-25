import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { UserRepositoryPostgres } from "../repositories/index.js";
import type { TenantId } from "@repo/contracts-core";
// Import canonical boundary validation utilities from work-core (Rule of Two compliance)
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts.js";

export const GetMembersByInstitutionInputSchema = z.object({
  institutionId: z.string().min(1),
  productId: z.string().min(1).default("academic"),
});

export type GetMembersByInstitutionInput = z.infer<typeof GetMembersByInstitutionInputSchema>;

export type GetMembersByInstitutionOutput = readonly {
  readonly id: string;
  readonly name: string;
  readonly type: "researcher" | "professor";
  readonly affiliation?: string;
  readonly location?: string;
  readonly publicationCount?: number;
  readonly citationCount?: number;
}[] | undefined;

export const getMembersByInstitutionCommand: CapabilityCommand = {
  kind: "command",
  name: "identity.getMembersByInstitution",
  version: "2.0.0", // Postgres-backed persistence
  async execute(input: unknown) {
    const parsed = GetMembersByInstitutionInputSchema.parse(input);
    const { institutionId } = parsed;

    // Validasi akses lintas domain terlebih dahulu (6-boundary compliance - identity -> work-core)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[identity.getMembersByInstitution] BOUNDARY ACCESS DENIED: identity domain cannot access work-core directly");
      throw new Error("Boundary access violation: domain identity tidak diizinkan mengakses domain work-core");
    }

    // Get all users affiliated with this institution
    const allUsers = await UserRepositoryPostgres.list();
    const affiliatedResearchers = allUsers
      .filter((user: any) => user.profile?.affiliationId === institutionId)
      .map((user: any) => ({
        id: user.id,
        name: user.profile?.fullName ?? "Unknown Researcher",
        type: user.type === "professor" ? "professor" as const : "researcher" as const,
        affiliation: user.profile?.affiliation,
        location: user.profile?.location,
        publicationCount: user.profile?.publicationCount,
        citationCount: user.profile?.citationCount,
      }));

    return affiliatedResearchers;
  },
};