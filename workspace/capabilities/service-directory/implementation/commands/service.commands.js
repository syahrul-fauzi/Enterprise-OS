import { z } from "zod";
import { ServiceProviderId, ServiceRequestId, } from "../contracts/service.contracts";
import { ServiceRequestRepositoryInMemory, ServiceRequestRepositoryPostgres, newServiceRequestId, defaultServiceRequestStatus, } from "../repository";
import { initIdentitySchema } from "@capabilities/identity/implementation/repositories/base.repository";
import { SessionRepositoryPostgres } from "@capabilities/identity/implementation/repositories/session.repository";
// Accept service request with full session context
const AcceptServiceRequestWithContextSchema = z.object({
    id: z.string().min(1),
    providerId: z.string().min(1),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
// Mark service delivered with full session context
const MarkServiceDeliveredWithContextSchema = z.object({
    id: z.string().min(1),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
// List service requests with session context for tenant/workspace isolation
const ListServiceRequestsWithContextSchema = z.object({
    query: z.string().optional(),
    status: z.enum(["draft", "accepted", "in_service", "delivered", "all"]).optional(),
    category: z.enum(["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development", "all"]).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
// Create service request with full session context
const CreateServiceRequestWithContextSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development"]),
    requesterName: z.string().optional(),
    budget: z.string().optional(),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
export const createServiceRequest = {
    kind: "command",
    name: "service-directory.createServiceRequest",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = CreateServiceRequestWithContextSchema.parse(input);
        const { title, description, category, requesterName, budget, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[service-directory.createServiceRequest] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[service-directory.createServiceRequest] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[service-directory.createServiceRequest] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[service-directory.createServiceRequest] Cross-workspace access attempt blocked - security violation");
        }
        const entity = {
            id: newServiceRequestId(),
            title: title.trim(),
            ...(description !== undefined && description !== ""
                ? { description }
                : {}),
            category: category,
            status: defaultServiceRequestStatus,
            ...(requesterName ? { requesterName } : {}),
            ...(budget ? { budget } : {}),
            createdAt: new Date(),
            updatedAt: new Date(),
            tenantId,
            workspaceId,
        };
        // Save to both repositories for backward compatibility
        ServiceRequestRepositoryInMemory.save(entity);
        await ServiceRequestRepositoryPostgres.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
export const acceptServiceRequest = {
    kind: "command",
    name: "service-directory.acceptServiceRequest",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = AcceptServiceRequestWithContextSchema.parse(input);
        const { id, providerId, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[service-directory.acceptServiceRequest] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[service-directory.acceptServiceRequest] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[service-directory.acceptServiceRequest] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[service-directory.acceptServiceRequest] Cross-workspace access attempt blocked - security violation");
        }
        const current = await ServiceRequestRepositoryPostgres.byId(ServiceRequestId(id));
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
        const next = {
            ...current,
            status: "accepted",
            providerId: ServiceProviderId(providerId),
            updatedAt: new Date(),
        };
        ServiceRequestRepositoryInMemory.save(next);
        await ServiceRequestRepositoryPostgres.save(next);
        return { id: next.id, status: "accepted", providerId: next.providerId };
    },
};
export const markServiceDelivered = {
    kind: "command",
    name: "service-directory.markServiceDelivered",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = MarkServiceDeliveredWithContextSchema.parse(input);
        const { id, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[service-directory.markServiceDelivered] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[service-directory.markServiceDelivered] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[service-directory.markServiceDelivered] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[service-directory.markServiceDelivered] Cross-workspace access attempt blocked - security violation");
        }
        const current = await ServiceRequestRepositoryPostgres.byId(ServiceRequestId(id));
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
        const next = {
            ...current,
            status: "delivered",
            deliveredAt,
            updatedAt: new Date()
        };
        ServiceRequestRepositoryInMemory.save(next);
        await ServiceRequestRepositoryPostgres.save(next);
        return { id: next.id, status: "delivered", deliveredAt };
    },
};
export const listServiceRequestsByWorkspace = {
    kind: "command",
    name: "service-directory.listByWorkspace",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = ListServiceRequestsWithContextSchema.parse(input);
        const { sessionId, tenantId, workspaceId, actorId, limit, offset } = parsed;
        // Validate session exists and is active
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session) {
            throw new Error("[service-directory.listByWorkspace] Invalid or expired session");
        }
        // Validate tenant and workspace isolation
        if (session.tenantId !== tenantId) {
            throw new Error("[service-directory.listByWorkspace] Session tenant mismatch - tenant isolation violation");
        }
        if (session.workspaceId !== workspaceId) {
            throw new Error("[service-directory.listByWorkspace] Session workspace mismatch - tenant isolation violation");
        }
        if (session.actorId !== actorId) {
            throw new Error("[service-directory.listByWorkspace] Session actor mismatch - authentication violation");
        }
        // Get all service requests for this workspace (already filtered by workspace for isolation)
        const allWorkspaceRequests = await ServiceRequestRepositoryPostgres.listByWorkspace(workspaceId);
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
            filteredRequests = filteredRequests.filter(r => r.title.toLowerCase().includes(query) ||
                (r.description?.toLowerCase().includes(query) ?? false));
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
export const serviceDirectoryCommands = {
    "service-directory.createServiceRequest": createServiceRequest,
    "service-directory.acceptServiceRequest": acceptServiceRequest,
    "service-directory.markServiceDelivered": markServiceDelivered,
    "service-directory.listByWorkspace": listServiceRequestsByWorkspace,
    "service-directory.getById": getServiceRequestByIdCommand,
};
