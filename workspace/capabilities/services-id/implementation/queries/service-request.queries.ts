import type { CapabilityQuery } from "@repo/core-kernel";
import { ServiceRequestRepositoryInMemory } from "../repository/service-request.repository";
import { ServiceRequestId, GetServiceRequestInput, GetServiceRequestOutput } from "../contracts/service-request.contracts";

const getServiceRequestById: CapabilityQuery<GetServiceRequestInput, GetServiceRequestOutput> = {
  kind: "query",
  name: "service-request.getById",
  version: "1.0.0",
  async execute(input) {
    const repository = new ServiceRequestRepositoryInMemory();
    return repository.byId(ServiceRequestId(input.id));
  },
};

export const serviceRequestQueries: Readonly<Record<string, CapabilityQuery>> = {
  "service-request.getById": getServiceRequestById,
} as const;