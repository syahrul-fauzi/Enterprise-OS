"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceRepositoryInMemory = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const seed = () => [
    {
        id: (0, identity_contracts_1.WorkspaceId)("workspace-001"),
        tenantId: (0, identity_contracts_1.TenantId)("tenant-001"),
        name: "Professional Workspace",
        productId: "services-id.default",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
        id: (0, identity_contracts_1.WorkspaceId)("workspace-002"),
        tenantId: (0, identity_contracts_1.TenantId)("tenant-002"),
        name: "Professional Workspace",
        productId: "lawyershub.default",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
];
function hydrate() {
    const s = new Map();
    for (const e of seed())
        s.set(e.id, e);
    return s;
}
const WORKSPACE_STORE = hydrate();
exports.WorkspaceRepositoryInMemory = Object.freeze({
    entityName: "Workspace",
    kind: "repository",
    byId(id) {
        return WORKSPACE_STORE.get(id);
    },
    listByTenant(tenantId) {
        return [...WORKSPACE_STORE.values()].filter((w) => w.tenantId === tenantId);
    },
    list() {
        return [...WORKSPACE_STORE.values()];
    },
    save(entity) {
        WORKSPACE_STORE.set(entity.id, entity);
        return entity;
    },
    remove(id) {
        return WORKSPACE_STORE.delete(id);
    },
});
