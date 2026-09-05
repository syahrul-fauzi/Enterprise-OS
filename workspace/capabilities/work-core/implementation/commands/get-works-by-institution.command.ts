import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { WorkRepositoryPostgres } from "../repository/work-postgres.repository";
import type { WorkAggregate } from "../../contracts/work.contracts";

export const GetWorksByInstitutionInputSchema = z.object({
  institutionId: z.string().min(1),
  productId: z.string().min(1).default("academic"),
});

export type GetWorksByInstitutionInput = z.infer<typeof GetWorksByInstitutionInputSchema>;

export type GetWorksByInstitutionOutput = readonly {
  readonly workId: string;
  readonly title: string;
  readonly description?: string;
  readonly state: "open" | "in_progress" | "blocked" | "completed";
  readonly updatedAt: string;
}[] | undefined;

export const getWorksByInstitutionCommand: CapabilityCommand = {
  kind: "command",
  name: "work.getWorksByInstitution",
  version: "1.0.0",
  async execute(input: unknown) {
    const parsed = GetWorksByInstitutionInputSchema.parse(input);
    const { institutionId } = parsed;

    const workRepository = new WorkRepositoryPostgres();
    const institutionWorks = await workRepository.listByInstitution(institutionId);

    // Map WorkAggregate to WorkItemCardProps compatible format
    return institutionWorks.map((work: WorkAggregate & { participantIds?: string[]; institutionId?: string }) => ({
      workId: work.workId,
      title: work.title,
      description: work.description,
      state: work.status === "draft" ? "open" as const : 
              work.status === "in_progress" ? "in_progress" as const :
              work.status === "blocked" ? "blocked" as const : "completed" as const,
      updatedAt: work.createdAt,
    }));
  },
};