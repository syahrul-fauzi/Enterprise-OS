"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkspaceCommand = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const repositories_1 = require("../repositories");
let workspaceIdCounter = 100;
function newWorkspaceId() {
    workspaceIdCounter += 1;
    return (0, identity_contracts_1.WorkspaceId)(`workspace-${workspaceIdCounter}`);
}
exports.createWorkspaceCommand = {
    kind: "command",
    name: "identity.createWorkspace",
    version: "1.0.0",
    execute(input) {
        const entity = {
            id: newWorkspaceId(),
            tenantId: input.tenantId,
            name: input.name.trim(),
            productId: input.productId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        repositories_1.WorkspaceRepositoryInMemory.save(entity);
        return {
            workspaceId: entity.id,
            tenantId: entity.tenantId,
            name: entity.name,
            productId: entity.productId,
        };
    },
};
