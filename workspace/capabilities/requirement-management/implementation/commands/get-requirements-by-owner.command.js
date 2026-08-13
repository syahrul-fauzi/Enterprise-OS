import { z } from "zod";
import { RequirementRepositoryCurrent } from "../repository";
export const GetRequirementsByOwnerInputSchema = z.object({
    ownerId: z.string().min(1),
    productId: z.string().min(1).default("academic"),
});
export const getRequirementsByOwnerCommand = {
    kind: "command",
    name: "requirement.getByOwner",
    version: "1.0.0",
    execute(input) {
        const parsed = GetRequirementsByOwnerInputSchema.parse(input);
        const { ownerId, productId } = parsed;
        const allRequirements = RequirementRepositoryCurrent.list();
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
