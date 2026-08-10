"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceDirectoryCommands = exports.markServiceDelivered = exports.acceptServiceRequest = exports.createServiceRequest = void 0;
const service_repository_1 = require("../repository/service.repository");
exports.createServiceRequest = {
    kind: "command",
    name: "service-directory.createServiceRequest",
    version: "0.1.0",
    execute(input) {
        const entity = {
            id: (0, service_repository_1.newServiceRequestId)(),
            title: input.title.trim(),
            ...(input.description !== undefined && input.description !== ""
                ? { description: input.description }
                : {}),
            category: input.category,
            status: service_repository_1.defaultServiceRequestStatus,
            ...(input.requesterName ? { requesterName: input.requesterName } : {}),
            ...(input.budget ? { budget: input.budget } : {}),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        service_repository_1.ServiceRequestRepositoryInMemory.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
exports.acceptServiceRequest = {
    kind: "command",
    name: "service-directory.acceptServiceRequest",
    version: "0.1.0",
    execute(input) {
        const current = service_repository_1.ServiceRequestRepositoryInMemory.byId(input.id);
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
        const next = {
            ...current,
            status: "accepted",
            providerId: input.providerId,
        };
        service_repository_1.ServiceRequestRepositoryInMemory.save(next);
        return { id: next.id, status: "accepted", providerId: next.providerId };
    },
};
exports.markServiceDelivered = {
    kind: "command",
    name: "service-directory.markServiceDelivered",
    version: "0.1.0",
    execute(input) {
        const current = service_repository_1.ServiceRequestRepositoryInMemory.byId(input.id);
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
        const next = { ...current, status: "delivered", deliveredAt };
        service_repository_1.ServiceRequestRepositoryInMemory.save(next);
        return { id: next.id, status: "delivered", deliveredAt };
    },
};
exports.serviceDirectoryCommands = {
    "service-directory.createServiceRequest": exports.createServiceRequest,
    "service-directory.acceptServiceRequest": exports.acceptServiceRequest,
    "service-directory.markServiceDelivered": exports.markServiceDelivered,
};
