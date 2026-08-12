"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequirementsByOwnerCommand = exports.GetRequirementsByOwnerInputSchema = void 0;
const zod_1 = require("zod");
const repository_1 = require("../repository");
exports.GetRequirementsByOwnerInputSchema = zod_1.z.object({
    ownerId: zod_1.z.string().min(1),
    productId: zod_1.z.string().min(1).default("academic"),
});
exports.getRequirementsByOwnerCommand = {
    kind: "command",
    name: "requirement.getByOwner",
    version: "1.0.0",
    execute(input) {
        const parsed = exports.GetRequirementsByOwnerInputSchema.parse(input);
        const { ownerId, productId } = parsed;
        const allRequirements = repository_1.RequirementRepositoryCurrent.list();
        const ownerRequirements = allRequirements
            .filter(req => req.ownerId === ownerId && (!productId || req.productId === productId))
            .map(req => ({
            id: req.id,
            title: req.title,
            description: req.description,
            status: req.status,
            author: req.author ? { name: req.author.name } : undefined,
            createdAt: req.createdAt.toISOString(),
            updatedAt: req.updatedAt.toISOString(),
        }));
        return ownerRequirements;
    },
};
