import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { RequirementRepositoryCurrent } from "../repository/index";
import type { RequirementAggregate } from "../contracts/index";

export const GetRequirementByIdInputSchema = z.object({
  id: z.string().min(1),
});

export type GetRequirementByIdInput = z.infer<typeof GetRequirementByIdInputSchema>;

export type GetRequirementByIdOutput = RequirementAggregate | undefined;

export const getRequirementByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "requirement.getById",
  version: "1.0.0",
  async execute(input: unknown) {
    const parsed = GetRequirementByIdInputSchema.parse(input);
    const { id } = parsed;

    const requirement = await RequirementRepositoryCurrent.byId(id as any);
    return requirement;
  },
};