import type { CapabilityQuery } from "@repo/core-kernel";
import {
  RequirementAggregate,
  type GetRequirementInput,
  type GetRequirementOutput,
  type SearchRequirementsInput,
  type SearchRequirementsOutput,
} from "../contracts";
import { RequirementRepositoryInMemory } from "../repository";

type GetRequirementQuery = CapabilityQuery<GetRequirementInput, GetRequirementOutput>;
type SearchRequirementsQuery = CapabilityQuery<
  SearchRequirementsInput,
  SearchRequirementsOutput
>;

export const getRequirement: GetRequirementQuery = {
  kind: "query",
  name: "requirement.get",
  version: "0.1.0",
  execute(input) {
    return RequirementRepositoryInMemory.byId(input.id);
  },
};

export const searchRequirements: SearchRequirementsQuery = {
  kind: "query",
  name: "requirement.search",
  version: "0.1.0",
  execute(input) {
    const all = RequirementRepositoryInMemory.list();
    const q = (input.query ?? "").trim().toLowerCase();
    let filtered: readonly RequirementAggregate[] = all;

    if (input.status !== undefined && input.status !== "all") {
      filtered = filtered.filter((item) => item.status === input.status);
    }
    if (input.priority !== undefined && input.priority !== "all") {
      filtered = filtered.filter((item) => item.priority === input.priority);
    }
    if (input.verificationStatus !== undefined && input.verificationStatus !== "all") {
      filtered = filtered.filter(
        (item) => item.verificationStatus === input.verificationStatus,
      );
    }
    if (input.linkedCapabilityId !== undefined) {
      filtered = filtered.filter((item) =>
        item.linkedCapabilityIds.includes(input.linkedCapabilityId!),
      );
    }
    if (input.owner !== undefined) {
      const ownerNeedle = input.owner.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.owner ?? "").toLowerCase().includes(ownerNeedle),
      );
    }
    if (q.length > 0) {
      filtered = filtered.filter((item) => {
        const hay = [
          item.id,
          item.title,
          item.summary ?? "",
          item.description ?? "",
          item.owner ?? "",
          item.source ?? "",
          item.status,
          item.priority,
          item.verificationStatus,
          item.linkedCapabilityIds.join(" "),
          item.acceptanceCriteria.join(" "),
        ]
          .join("\n")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const total = all.length;
    const matched = filtered.length;
    const limit = Math.max(1, Math.min(500, input.limit ?? 50));
    const offset = Math.max(0, input.offset ?? 0);
    const items = filtered.slice(offset, offset + limit);
    return {
      items,
      total,
      matched,
      limit,
      offset,
    };
  },
};

export const requirementQueries: Readonly<Record<string, CapabilityQuery>> = {
  "requirement.get": getRequirement,
  "requirement.search": searchRequirements,
} as const;
