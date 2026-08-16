import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { UserRepositoryPostgres } from "../repositories/index";
import type { UserId } from "../contracts/identity.contracts";

export const GetMemberByIdInputSchema = z.object({
  memberId: z.string().min(1),
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
} | undefined;

export const getMemberByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "identity.getMemberById",
  version: "2.0.0", // Postgres-backed persistence
  async execute(input: unknown) {
    const parsed = GetMemberByIdInputSchema.parse(input);
    const { memberId } = parsed;

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
      researcherCount: undefined, // FIXME: This information is no longer in UserAggregate
      createdAt: userCreatedAt.toISOString(),
      updatedAt: userUpdatedAt.toISOString(),
    };
  },
};