import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { RequirementRepositoryCurrent } from "../repository/index";
import type { RequirementAggregate } from "../contracts/index";

export const GetAllRequirementsInputSchema = z.object({
  productId: z.string().min(1).default("academic"),
  searchQuery: z.string().default(""),
  filterStatus: z.string().default("all"),
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
  version: "1.0.0",
  async execute(input: unknown) {
    const parsed = GetAllRequirementsInputSchema.parse(input);
    const { searchQuery, filterStatus } = parsed;

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