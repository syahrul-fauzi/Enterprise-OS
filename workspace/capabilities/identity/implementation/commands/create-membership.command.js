"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMembershipCommand = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const repositories_1 = require("../repositories");
let membershipIdCounter = 100;
function newMembershipId() {
    membershipIdCounter += 1;
    return (0, identity_contracts_1.MembershipId)(`membership-${membershipIdCounter}`);
}
exports.createMembershipCommand = {
    kind: "command",
    name: "identity.createMembership",
    version: "1.0.0",
    execute(input) {
        const existing = repositories_1.MembershipRepositoryInMemory.find(input.userId, input.tenantId, input.workspaceId);
        if (existing !== undefined) {
            return {
                membershipId: existing.id,
                userId: existing.userId,
                tenantId: existing.tenantId,
                workspaceId: existing.workspaceId,
                role: existing.role,
            };
        }
        const entity = {
            id: newMembershipId(),
            userId: input.userId,
            tenantId: input.tenantId,
            workspaceId: input.workspaceId,
            role: input.role,
            joinedAt: new Date(),
            updatedAt: new Date(),
        };
        repositories_1.MembershipRepositoryInMemory.save(entity);
        return {
            membershipId: entity.id,
            userId: entity.userId,
            tenantId: entity.tenantId,
            workspaceId: entity.workspaceId,
            role: entity.role,
        };
    },
};
