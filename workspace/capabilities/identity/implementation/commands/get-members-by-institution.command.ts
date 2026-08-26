import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { UserRepositoryPostgres } from "../repositories/index";
import type { TenantId } from "../contracts/identity.contracts";

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