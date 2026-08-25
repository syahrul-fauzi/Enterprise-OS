import type { ServiceProviderCategory, CreateServiceRequestInput } from "../contracts/service.contracts.js";
import { ServiceRequestRepositoryInMemory as ServiceRequestRepository } from "../repository/service.repository.js";
import { validateBatchItems } from "../validation/batch-validator.js";

interface BatchCreateInput {
  items: Array<{
    title: string;
    description: string;
    category: ServiceProviderCategory;
    budget?: string;
  }>;
  context: {
    product: string;
    tenantId: string;
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

  // 2. Initialize repository with tenant isolation
  const repository = new ServiceRequestRepository({
    product: input.context.product,
    tenantId: input.context.tenantId,
    workspaceId: input.context.workspaceId,
  });

  // 3. Map batch items to individual create inputs
  const createInputs: CreateServiceRequestInput[] = input.items.map(item => ({
    title: item.title,
    description: item.description,
    category: item.category,
    budget: item.budget,
    createdBy: input.context.actorId,
    status: "draft", // Default status for new requests
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