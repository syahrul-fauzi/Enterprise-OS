import type { CapabilityQuery } from "@repo/core-kernel";
import {
  RequirementAggregate,
  type GetRequirementInput,
  type GetRequirementOutput,
  type SearchRequirementsInput,
  type SearchRequirementsOutput,
} from "../contracts/index.js";
import { RequirementRepositoryCurrent } from "../repository/index.js";
import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";
import type { WorkAggregate, WorkFaceProjection } from "../../../work-core/contracts/work.contracts.js";

// FACE-001: RequirementFaceProjection interface untuk layer presentasi (server-derived only)
export interface RequirementFaceProjection {
  readonly requirementId: string;
  readonly workId: string;
  readonly title: string;
  readonly summary?: string;
  readonly status: string;
  readonly priority: string;
  readonly owner?: string;
  readonly linkedCapabilityIds: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly verificationStatus: string;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly sourceWorkProjection: WorkFaceProjection;
}

// Input type untuk requirement.getProjectionById
export interface GetRequirementProjectionInput {
  id: string;
  sessionId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

type GetRequirementQuery = CapabilityQuery<GetRequirementInput, GetRequirementOutput & { work?: WorkAggregate }>;
type GetRequirementProjectionQuery = CapabilityQuery<GetRequirementProjectionInput, RequirementFaceProjection | undefined>;
type SearchRequirementsQuery = CapabilityQuery<
  SearchRequirementsInput,
  SearchRequirementsOutput & { items: (RequirementAggregate & { work?: WorkAggregate })[] }
>;

export const getRequirement: GetRequirementQuery = {
  kind: "query",
  name: "requirement.get",
  version: "0.1.0",
  async execute(input: GetRequirementInput) {
    const requirement = await RequirementRepositoryCurrent.byId(input.id);
    if (!requirement) {
      // Return properly typed object even when not found to satisfy interface
      return undefined as unknown as RequirementAggregate & { work?: WorkAggregate | undefined };
    }
    
    // PROD-001-02-03: Join dengan work node dari High-Value Work Graph
    const workRepo = getWorkRepositoryPostgres();
    const work = await workRepo.byWorkId(requirement.workId);
    return { ...requirement, work };
  },
};

// SERVER-FACE-001: Endpoint baru untuk mengembalikan RequirementFaceProjection (server-derived only)
// Mematuhi invariant: "FACE is a projection, not owner" dari core Work data
export const getRequirementProjection: GetRequirementProjectionQuery = {
  kind: "query",
  name: "requirement.getProjectionById",
  version: "0.1.0",
  async execute(input: GetRequirementProjectionInput) {
    // 1. Ambil data requirement aggregate dari repository
    const requirement = await RequirementRepositoryCurrent.byId(input.id);
    if (!requirement) {
      return undefined;
    }

    // 2. Ambil data Work aggregate untuk membangun sourceWorkProjection
    const workRepo = getWorkRepositoryPostgres();
    const work = await workRepo.byWorkId(requirement.workId);
    if (!work) {
      return undefined;
    }

    // 3. Konversi WorkAggregate menjadi canonical WorkFaceProjection (menggunakan pola yang sudah ada)
    // Ekstrak field yang diperlukan dari WorkAggregate untuk membangun WorkFaceProjection
    const sourceWorkProjection: WorkFaceProjection = {
      workId: work.id,
      identity: work.identity,
      semantic: work.semantic,
      authority: work.authority,
      execution: work.execution,
      presentation: work.presentation,
      derivedState: {
        canCurrentActorAct: true, // Dihitung server-side berdasarkan input.actorId (sederhanakan untuk first implementation)
        nextAvailableActions: [],
        evidenceCount: work.evidence?.length ?? 0,
        actorCount: work.actors?.length ?? 0,
      }
    };

    // 4. Bangun dan return RequirementFaceProjection (semua field berasal dari server, tidak ada yang di-simpan di client)
    const requirementProjection: RequirementFaceProjection = {
      requirementId: requirement.id,
      workId: requirement.workId,
      title: requirement.title,
      summary: requirement.summary,
      status: requirement.status,
      priority: requirement.priority,
      owner: requirement.owner,
      linkedCapabilityIds: requirement.linkedCapabilityIds,
      acceptanceCriteria: requirement.acceptanceCriteria,
      verificationStatus: requirement.verificationStatus,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
      sourceWorkProjection
    };

    return requirementProjection;
  },
};

export const searchRequirements: SearchRequirementsQuery = {
  kind: "query",
  name: "requirement.search",
  version: "0.1.0",
  async execute(input: SearchRequirementsInput) {
    const all = await RequirementRepositoryCurrent.list();
    const q = (input.query ?? "").trim().toLowerCase();
    let filtered: readonly RequirementAggregate[] = all;

    // CORE-001: workId sebagai primary filter (precedence over workspace/tenant)
    if (input.workId !== undefined) {
      filtered = filtered.filter((item) => item.workId === input.workId);
    }
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

    // PROD-001-02-03: Attach work node data untuk semua requirements yang terfilter
    const workRepo = getWorkRepositoryPostgres();
    const itemsWithWork = await Promise.all(
      filtered.map(async (item) => {
        const work = await workRepo.byWorkId(item.workId);
        return { ...item, work };
      })
    );

    const total = all.length;
    const matched = itemsWithWork.length;
    const limit = Math.max(1, Math.min(500, input.limit ?? 50));
    const offset = Math.max(0, input.offset ?? 0);
    const items = itemsWithWork.slice(offset, offset + limit);
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