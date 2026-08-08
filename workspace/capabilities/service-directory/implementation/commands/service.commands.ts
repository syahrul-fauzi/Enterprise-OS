import {
  CreateServiceRequestInput,
  CreateServiceRequestOutput,
  ServiceProviderCategory,
  ServiceRequestAggregate,
  ServiceRequestId,
  ServiceRequestStatus,
} from "../contracts/service.contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  ServiceRequestRepositoryInMemory,
  newServiceRequestId,
  defaultServiceRequestStatus,
} from "../repository/service.repository";

type CreateServiceRequestCommand = CapabilityCommand<CreateServiceRequestInput, CreateServiceRequestOutput>;

interface AcceptServiceRequestInput {
  readonly id: ServiceRequestId;
  readonly providerId: string;
}
interface AcceptServiceRequestOutput {
  readonly id: ServiceRequestId;
  readonly status: ServiceRequestStatus;
  readonly providerId: string;
}
type AcceptServiceRequestCommand = CapabilityCommand<AcceptServiceRequestInput, AcceptServiceRequestOutput>;

interface MarkServiceDeliveredInput {
  readonly id: ServiceRequestId;
}
interface MarkServiceDeliveredOutput {
  readonly id: ServiceRequestId;
  readonly status: "delivered";
  readonly deliveredAt: Date;
}
type MarkServiceDeliveredCommand = CapabilityCommand<MarkServiceDeliveredInput, MarkServiceDeliveredOutput>;

export const createServiceRequest: CreateServiceRequestCommand = {
  kind: "command",
  name: "service-directory.createServiceRequest",
  version: "0.1.0",
  execute(input) {
    const entity: ServiceRequestAggregate = {
      id: newServiceRequestId(),
      title: input.title.trim(),
      ...(input.description !== undefined && input.description !== ""
        ? { description: input.description }
        : {}),
      category: input.category as ServiceProviderCategory,
      status: defaultServiceRequestStatus,
      ...(input.requesterName ? { requesterName: input.requesterName } : {}),
      ...(input.budget ? { budget: input.budget } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ServiceRequestRepositoryInMemory.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const acceptServiceRequest: AcceptServiceRequestCommand = {
  kind: "command",
  name: "service-directory.acceptServiceRequest",
  version: "0.1.0",
  execute(input) {
    const current = ServiceRequestRepositoryInMemory.byId(input.id);
    if (current === undefined) {
      throw new Error(`[acceptServiceRequest] ServiceRequest not found: ${input.id}`);
    }
    if (current.status === "delivered" || current.status === "verified") {
      return {
        id: current.id,
        status: current.status,
        providerId: current.providerId ?? input.providerId,
      };
    }
    const next: ServiceRequestAggregate = {
      ...current,
      status: "accepted",
      providerId: input.providerId as ServiceRequestAggregate["providerId"],
    };
    ServiceRequestRepositoryInMemory.save(next);
    return { id: next.id, status: "accepted", providerId: next.providerId! };
  },
};

export const markServiceDelivered: MarkServiceDeliveredCommand = {
  kind: "command",
  name: "service-directory.markServiceDelivered",
  version: "0.1.0",
  execute(input) {
    const current = ServiceRequestRepositoryInMemory.byId(input.id);
    if (current === undefined) {
      throw new Error(`[markServiceDelivered] ServiceRequest not found: ${input.id}`);
    }
    if (current.status === "delivered" || current.status === "verified") {
      return {
        id: current.id,
        status: "delivered",
        deliveredAt: current.deliveredAt ?? new Date(),
      };
    }
    const deliveredAt = new Date();
    const next: ServiceRequestAggregate = { ...current, status: "delivered", deliveredAt };
    ServiceRequestRepositoryInMemory.save(next);
    return { id: next.id, status: "delivered", deliveredAt };
  },
};

export const serviceDirectoryCommands: Readonly<Record<string, CapabilityCommand>> = {
  "service-directory.createServiceRequest": createServiceRequest,
  "service-directory.acceptServiceRequest": acceptServiceRequest,
  "service-directory.markServiceDelivered": markServiceDelivered,
} as const;

export type {
  CreateServiceRequestCommand,
  AcceptServiceRequestCommand,
  MarkServiceDeliveredCommand,
};
