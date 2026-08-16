import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { RequirementRepositoryCurrent } from "../repository/index";
import type { RequirementAggregate } from "../contracts/index";

export const GetRequirementsByOwnerInputSchema = z.object({
  ownerId: z.string().min(1),
  productId: z.string().min(1).default("academic"),
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
  version: "1.0.0",
  execute(input: unknown) {
    const parsed = GetRequirementsByOwnerInputSchema.parse(input);
    const { ownerId, productId } = parsed;

    const allRequirements = RequirementRepositoryCurrent.list();
    const ownerRequirements = allRequirements
      .filter((req: RequirementAggregate) => req.ownerId === ownerId && (!productId || req.productId === productId))
      .map((req: RequirementAggregate) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        status: req.status,
        author: req.author ? { name: req.author.name } : undefined,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      }));

    return ownerRequirements;
  },
};