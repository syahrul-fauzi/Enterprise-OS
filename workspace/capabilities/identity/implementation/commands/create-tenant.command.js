"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantCommand = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const repositories_1 = require("../repositories");
let tenantIdCounter = 100;
function newTenantId() {
    tenantIdCounter += 1;
    return (0, identity_contracts_1.TenantId)(`tenant-${tenantIdCounter}`);
}
exports.createTenantCommand = {
    kind: "command",
    name: "identity.createTenant",
    version: "1.0.0",
    execute(input) {
        const slug = input.slug.trim().toLowerCase();
        if (repositories_1.TenantRepositoryInMemory.bySlug(slug) !== undefined) {
            throw new Error(`[identity.createTenant] Slug already taken: ${slug}`);
        }
        const entity = {
            id: newTenantId(),
            name: input.name.trim(),
            slug,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        repositories_1.TenantRepositoryInMemory.save(entity);
        return {
            tenantId: entity.id,
            name: entity.name,
            slug: entity.slug,
        };
    },
};
