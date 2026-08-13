import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { ServiceRequestRepositoryPostgres } from "../repository/service.repository";
import type { ServiceRequestId, ServiceRequestAggregate } from "../contracts/service.contracts";
import { initIdentitySchema } from "@capabilities/identity/implementation/repositories/base.repository";
import { SessionRepositoryPostgres } from "@capabilities/identity/implementation/repositories/session.repository";

export const GetServiceRequestByIdInputSchema = z.object({
  serviceRequestId: z.string().min(1).startsWith("sreq-"),
  // Required context for tenant isolation and authentication
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
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

export const getServiceRequestByIdCommand: CapabilityCommand<GetServiceRequestByIdInput, Promise<GetServiceRequestByIdOutput>> = {
  kind: "command",
  name: "service-directory.getById",
  version: "2.0.0",
  async execute(input: unknown) {
    await initIdentitySchema();
    
    const parsed = GetServiceRequestByIdInputSchema.parse(input);
    const { serviceRequestId, sessionId, tenantId, workspaceId, actorId } = parsed;

    // Validate session exists and is active
    const session = await SessionRepositoryPostgres.byId(sessionId as any);
    if (!session) {
      throw new Error("[service-directory.getById] Invalid or expired session");
    }

    // Validate tenant and workspace isolation
    if (session.tenantId !== tenantId) {
      throw new Error("[service-directory.getById] Session tenant mismatch - tenant isolation violation");
    }
    if (session.workspaceId !== workspaceId) {
      throw new Error("[service-directory.getById] Session workspace mismatch - tenant isolation violation");
    }
    if (session.actorId !== actorId) {
      throw new Error("[service-directory.getById] Session actor mismatch - authentication violation");
    }

    const r = await ServiceRequestRepositoryPostgres.byId(serviceRequestId as unknown as ServiceRequestId);
    if (r === undefined) {
      return undefined;
    }

    // Additional service request-level tenant isolation check
    if ((r as ServiceRequestAggregate).tenantId !== tenantId || (r as ServiceRequestAggregate).workspaceId !== workspaceId) {
      throw new Error("[service-directory.getById] ServiceRequest does not belong to the current tenant/workspace - access denied");
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
      budget: r.budget ? parseFloat(r.budget) : undefined,
      providerId: r.providerId,
    };
  },
};