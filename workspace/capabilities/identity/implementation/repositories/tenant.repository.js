"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRepositoryInMemory = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const seed = () => [
    {
        id: (0, identity_contracts_1.TenantId)("tenant-001"),
        name: "Alice Personal",
        slug: "alice-personal",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
        id: (0, identity_contracts_1.TenantId)("tenant-002"),
        name: "Bob Personal",
        slug: "bob-personal",
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
const TENANT_STORE = hydrate();
exports.TenantRepositoryInMemory = Object.freeze({
    entityName: "Tenant",
    kind: "repository",
    byId(id) {
        return TENANT_STORE.get(id);
    },
    bySlug(slug) {
        const needle = slug.trim().toLowerCase();
        for (const t of TENANT_STORE.values()) {
            if (t.slug.trim().toLowerCase() === needle)
                return t;
        }
        return undefined;
    },
    list() {
        return [...TENANT_STORE.values()];
    },
    save(entity) {
        TENANT_STORE.set(entity.id, entity);
        return entity;
    },
    remove(id) {
        return TENANT_STORE.delete(id);
    },
});
