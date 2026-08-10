"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipRepositoryInMemory = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const seed = () => [
    {
        id: (0, identity_contracts_1.MembershipId)("membership-001"),
        userId: (0, identity_contracts_1.UserId)("user-001"),
        tenantId: (0, identity_contracts_1.TenantId)("tenant-001"),
        workspaceId: (0, identity_contracts_1.WorkspaceId)("workspace-001"),
        role: "owner",
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
        id: (0, identity_contracts_1.MembershipId)("membership-002"),
        userId: (0, identity_contracts_1.UserId)("user-002"),
        tenantId: (0, identity_contracts_1.TenantId)("tenant-002"),
        workspaceId: (0, identity_contracts_1.WorkspaceId)("workspace-002"),
        role: "owner",
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
];
function hydrate() {
    const s = new Map();
    for (const e of seed())
        s.set(e.id, e);
    return s;
}
const MEMBERSHIP_STORE = hydrate();
exports.MembershipRepositoryInMemory = Object.freeze({
    entityName: "Membership",
    kind: "repository",
    byId(id) {
        return MEMBERSHIP_STORE.get(id);
    },
    listByUser(userId) {
        return [...MEMBERSHIP_STORE.values()].filter((m) => m.userId === userId);
    },
    listByTenant(tenantId) {
        return [...MEMBERSHIP_STORE.values()].filter((m) => m.tenantId === tenantId);
    },
    listByWorkspace(workspaceId) {
        return [...MEMBERSHIP_STORE.values()].filter((m) => m.workspaceId === workspaceId);
    },
    find(userId, tenantId, workspaceId) {
        for (const m of MEMBERSHIP_STORE.values()) {
            if (m.userId === userId && m.tenantId === tenantId && m.workspaceId === workspaceId)
                return m;
        }
        return undefined;
    },
    list() {
        return [...MEMBERSHIP_STORE.values()];
    },
    save(entity) {
        MEMBERSHIP_STORE.set(entity.id, entity);
        return entity;
    },
    remove(id) {
        return MEMBERSHIP_STORE.delete(id);
    },
});
