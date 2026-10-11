import type { ServiceProviderCategory, CreateServiceRequestInputLegacy as CreateServiceRequestInput } from "../contracts/service.contracts.js";
import type { TenantId, WorkspaceId } from "@capabilities/work-core";
import { createTenantId, createWorkspaceId } from "../../../work-core/contracts/work.contracts.js";
import { ServiceRequestRepositoryInMemory as ServiceRequestRepository } from "../repository/service.repository.js";
import { validateBatchItems } from "../validation/batch-validator.js";
import { getServiceRequestRepositoryPostgres } from "../repository/index.js";

interface BatchCreateInput {
  items: Array<{
    title: string;
    description: string;
    category: ServiceProviderCategory;
    budget?: string;
  }>;
  context: {
    product: string;
    tenantId: TenantId;
    workspaceId: string;
    actorId: string;
  };
}

export async function createServiceRequestBatch(input: BatchCreateInput): Promise<string[]> {
  // 1. Validate all input items meet business rules
  const validationResult = validateBatchItems(input.items);
  if (!validationResult.valid) {
    throw new Error(`Batch validation failed: ${validationResult.errors.join(', ')}`);
  }

  // 2. Initialize repository with tenant isolation (gunakan factory function yang terdaftar)
  const repository = getServiceRequestRepositoryPostgres();

  // 3. Map batch items to individual create inputs (tambahkan tenantId/workspaceId dari input context - W-SVC-001 tenant isolation)
  // Reuse createWorkspaceId/createTenantId factory functions to match branded type requirements
  const createInputs: CreateServiceRequestInput[] = input.items.map(item => ({
    title: item.title,
    description: item.description,
    category: item.category,
    budget: item.budget,
    createdBy: input.context.actorId,
    status: "draft",
    tenantId: createTenantId(input.context.tenantId as unknown as string),
    workspaceId: createWorkspaceId(input.context.workspaceId as unknown as string),
  }));

  // 4. Execute batch creation in transaction (atomicity maintained)
  const createdIds = await repository.createMany(createInputs);

  // 5. Emit domain events for observability
  for (const id of createdIds) {
    // Emit service-request:created event to event bus
    process.emit("service-request:created", {
      id,
      actorId: input.context.actorId,
      product: input.context.product,
      tenantId: input.context.tenantId,
      workspaceId: input.context.workspaceId,
    });
  }

  return createdIds;
}