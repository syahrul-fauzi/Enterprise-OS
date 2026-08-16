import { z } from "zod";
import {
  CreateServiceRequestInput,
  CreateServiceRequestOutput,
  ServiceProviderCategory,
  ServiceProviderId,
  ServiceRequestAggregate,
  ServiceProviderAggregate,
  ServiceRequestId,
  ServiceRequestStatus,
} from "../contracts/service.contracts";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types";
import {
  ServiceRequestRepositoryInMemory,
  ServiceProviderRepositoryInMemory,
  newServiceRequestId,
  defaultServiceRequestStatus,
  getServiceRequestRepositoryPostgres,
  getServiceProviderRepositoryPostgres,
} from "../repository/index";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres, initIdentitySchema } from "../../../identity/implementation/repositories/index";

// SHARED RAIL: Initialize identity schema if Postgres is active (MIRRORS ILC pattern)
if (process.env.DATABASE_URL) {
  initIdentitySchema();
}

// SHARED RAIL: Toggle session repository based on environment (MIRRORS LH pattern)
const sessionRepository = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

// SHARED RAIL: Toggle repository based on environment (MIRRORS LH pattern)
const serviceRepository = process.env.DATABASE_URL
  ? getServiceRequestRepositoryPostgres()
  : ServiceRequestRepositoryInMemory;

// SHARED RAIL: Toggle service provider repository based on environment
const providerRepository = process.env.DATABASE_URL
  ? getServiceProviderRepositoryPostgres()
  : ServiceProviderRepositoryInMemory;

// Define base interfaces only once
interface AcceptServiceRequestInput {
  readonly id: ServiceRequestId;
  readonly providerId: string;
}
interface AcceptServiceRequestOutput {
  readonly id: ServiceRequestId;
  readonly status: ServiceRequestStatus;
  readonly providerId: string;
}

interface MarkServiceDeliveredInput {
  readonly id: ServiceRequestId;
}
interface MarkServiceDeliveredOutput {
  readonly id: ServiceRequestId;
  readonly status: "delivered";
  readonly deliveredAt: Date;
}

// SHARED RAIL: Accept service request with sessionId ONLY (MIRRORS LH minimal context pattern)
const AcceptServiceRequestWithContextSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type AcceptServiceRequestWithContextInput = z.infer<typeof AcceptServiceRequestWithContextSchema>;
type AcceptServiceRequestCommand = CapabilityCommand<AcceptServiceRequestWithContextInput, Promise<AcceptServiceRequestOutput>>;

// SHARED RAIL: Mark service delivered with sessionId ONLY (MIRRORS LH minimal context pattern)
const MarkServiceDeliveredWithContextSchema = z.object({
  id: z.string().min(1),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type MarkServiceDeliveredWithContextInput = z.infer<typeof MarkServiceDeliveredWithContextSchema>;
type MarkServiceDeliveredCommand = CapabilityCommand<MarkServiceDeliveredWithContextInput, Promise<MarkServiceDeliveredOutput>>;

// SHARED RAIL: List service requests with sessionId ONLY (MIRRORS LH minimal context pattern)
const ListServiceRequestsWithContextSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["draft", "accepted", "in_service", "delivered", "all"]).optional(),
  category: z.enum(["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development", "all"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type ListServiceRequestsWithContextInput = z.infer<typeof ListServiceRequestsWithContextSchema>;

type ListServiceRequestsOutput = {
  readonly items: readonly ServiceRequestAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
};

type ListServiceRequestsCommand = CapabilityCommand<ListServiceRequestsWithContextInput, Promise<ListServiceRequestsOutput>>;

// SHARED RAIL: Create service request with sessionId ONLY (MIRRORS LH minimal context pattern)
const CreateServiceRequestWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development"]),
  requesterName: z.string().optional(),
  budget: z.string().optional(),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type CreateServiceRequestWithContextInput = z.infer<typeof CreateServiceRequestWithContextSchema>;
type CreateServiceRequestCommand = CapabilityCommand<CreateServiceRequestWithContextInput, Promise<CreateServiceRequestOutput>>;

export const createServiceRequest: CreateServiceRequestCommand = {
  kind: "command",
  name: "service-directory.createServiceRequest",
  version: "2.0.0",
  async execute(input: CreateServiceRequestWithContextInput) {
    const parsed = CreateServiceRequestWithContextSchema.parse(input);
    const { title, description, category, requesterName, budget, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.createServiceRequest] Invalid or revoked session - authentication violation");
    }

    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH minimal fix)
    const { tenantId, workspaceId, actorId } = session;
    // Enforce security via session's already verified isolation guarantees
    // No need for additional checks - session is cryptographically bound to tenant/workspace

    const entity: ServiceRequestAggregate = {
      id: newServiceRequestId(),
      title: title.trim(),
      ...(description !== undefined && description !== ""
        ? { description }
        : {}),
      category: category as ServiceProviderCategory,
      status: defaultServiceRequestStatus,
      requesterName,
      ...(budget ? { budget } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId,
      workspaceId,
      actorId,
    };

    await serviceRepository.save(entity);

    return { id: entity.id, status: entity.status };
  },
};

export const acceptServiceRequest: AcceptServiceRequestCommand = {
  kind: "command",
  name: "service-directory.acceptServiceRequest",
  version: "2.0.0",
  async execute(input: AcceptServiceRequestWithContextInput) {
    const parsed = AcceptServiceRequestWithContextSchema.parse(input);
    const { id, providerId, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.acceptServiceRequest] Invalid or revoked session - authentication violation");
    }
    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH)
    const { tenantId, workspaceId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.acceptServiceRequest] ServiceRequest not found: ${id}`);
    }
    if (current.status === "delivered" || current.status === "verified") {
      return {
        id: current.id,
        status: current.status,
        providerId: current.providerId ?? ServiceProviderId(providerId),
      };
    }
    const next: ServiceRequestAggregate = {
      ...current,
      status: "accepted",
      providerId: ServiceProviderId(providerId),
      updatedAt: new Date(),
    };
    await serviceRepository.save(next);
    return { id: next.id, status: "accepted", providerId: next.providerId! };
  },
};

export const markServiceDelivered: MarkServiceDeliveredCommand = {
  kind: "command",
  name: "service-directory.markServiceDelivered",
  version: "2.0.0",
  async execute(input: MarkServiceDeliveredWithContextInput) {
    const parsed = MarkServiceDeliveredWithContextSchema.parse(input);
    const { id, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.markServiceDelivered] Invalid or revoked session - authentication violation");
    }
    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH)
    const { tenantId, workspaceId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.markServiceDelivered] ServiceRequest not found: ${id}`);
    }
    if (current.status === "delivered" || current.status === "verified") {
      return {
        id: current.id,
        status: "delivered",
        deliveredAt: current.deliveredAt ?? new Date(),
      };
    }
    const deliveredAt = new Date();
    const next: ServiceRequestAggregate = {
      ...current,
      status: "delivered",
      deliveredAt,
      updatedAt: new Date()
    };
    await serviceRepository.save(next);
    return { id: next.id, status: "delivered", deliveredAt };
  },
};

export const listServiceRequestsByWorkspace: ListServiceRequestsCommand = {
  kind: "command",
  name: "service-directory.listByWorkspace",
  version: "2.0.0",
  async execute(input: ListServiceRequestsWithContextInput) {
    const parsed = ListServiceRequestsWithContextSchema.parse(input);
    const { sessionId, limit, offset } = parsed;

    // Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.listByWorkspace] Invalid or revoked session - authentication violation");
    }

    // Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH minimal fix)
    const { tenantId, workspaceId, actorId } = session;
    // Session is already verified during creation - no need for redundant checks

    // Get all service requests for this workspace (already filtered by workspace for isolation)
    const allWorkspaceRequests = await serviceRepository.listByWorkspace(workspaceId);

    // Apply filters if provided
    let filteredRequests = [...allWorkspaceRequests];

    // Filter by status if not "all"
    if (parsed.status && parsed.status !== "all") {
      filteredRequests = filteredRequests.filter(r => r.status === parsed.status);
    }

    // Filter by category if not "all"
    if (parsed.category && parsed.category !== "all") {
      filteredRequests = filteredRequests.filter(r => r.category === parsed.category);
    }

    // Filter by search query if provided
    if (parsed.query) {
      const query = parsed.query.toLowerCase();
      filteredRequests = filteredRequests.filter(r =>
        r.title.toLowerCase().includes(query) ||
        (r.description?.toLowerCase().includes(query) ?? false)
      );
    }

    // Apply pagination
    const paginatedRequests = filteredRequests.slice(offset, offset + limit);

    return {
      items: paginatedRequests,
      total: allWorkspaceRequests.length,
      matched: filteredRequests.length,
      offset,
      limit,
    };
  },
};

import { getServiceRequestByIdCommand } from "./get-service-request-by-id.command";

export const serviceDirectoryCommands: Readonly<Record<string, CapabilityCommand>> = {
  "service-directory.createServiceRequest": createServiceRequest,
  "service-directory.acceptServiceRequest": acceptServiceRequest,
  "service-directory.markServiceDelivered": markServiceDelivered,
  "service-directory.listByWorkspace": listServiceRequestsByWorkspace,
  "service-directory.getById": getServiceRequestByIdCommand,
} as const;

export type {
  CreateServiceRequestCommand,
  AcceptServiceRequestCommand,
  MarkServiceDeliveredCommand,
};