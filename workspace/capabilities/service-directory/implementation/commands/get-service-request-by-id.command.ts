import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { ServiceRequestRepositoryInMemory } from "../repository/service.repository";
import type { ServiceRequestId } from "../contracts/service.contracts";

export const GetServiceRequestByIdInputSchema = z.object({
  serviceRequestId: z.string().min(1).startsWith("sreq-"),
});

export type GetServiceRequestByIdInput = z.infer<typeof GetServiceRequestByIdInputSchema>;

export type GetServiceRequestByIdOutput = {
  readonly type: "services-id.request";
  readonly id: string;
  readonly displayTitle: string;
  readonly displaySubtitle: string;
  readonly rawStatus: string;
  readonly owner: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly evidenceCount: number;
  readonly category: string | undefined;
  readonly budget: number | undefined;
  readonly providerId: string | undefined;
} | undefined;

export const getServiceRequestByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "serviceRequest.getById",
  version: "1.0.0",
  execute(input: unknown) {
    const parsed = GetServiceRequestByIdInputSchema.parse(input);
    const { serviceRequestId } = parsed;

    const r = ServiceRequestRepositoryInMemory.byId(serviceRequestId as unknown as ServiceRequestId);
    if (r === undefined) {
      return undefined;
    }

    return {
      type: "services-id.request",
      id: serviceRequestId,
      displayTitle: r.title,
      displaySubtitle: r.description ?? "Service Request",
      rawStatus: r.status,
      owner: r.requesterName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      evidenceCount: r.providerId ? 1 : 0,
      category: r.category,
      budget: r.budget,
      providerId: r.providerId,
    };
  },
};