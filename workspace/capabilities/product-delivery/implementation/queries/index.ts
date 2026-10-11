import type { CapabilityQuery } from "@repo/core-kernel";
import { getDeliveryRepositoryPostgres } from "../repository/index";
import { createDeliveryId, GetDeliveryInput, GetDeliveryOutput } from "../contracts/index";

const getDeliveryById: CapabilityQuery<GetDeliveryInput, GetDeliveryOutput> = {
  kind: "query",
  name: "delivery.getById",
  version: "1.0.0",
  async execute(input) {
    const repository = getDeliveryRepositoryPostgres();
    return repository.getById(createDeliveryId(input.id));
  },
};

export const deliveryQueries: Readonly<Record<string, CapabilityQuery>> = {
  "delivery.getById": getDeliveryById,
} as const;