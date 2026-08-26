import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  TenantId,
  UserId,
  type TenantAggregate,
} from "../contracts/identity.contracts";
import { TenantRepositoryPostgres } from "../repositories/index";
import { initIdentitySchema } from "../repositories/base.repository";
import { slugifyForTenant } from "../services/password.service";

function newTenantId(): TenantId {
  return TenantId(`tenant-${randomUUID()}`);
}

export const CreateTenantWithSlugResolutionInputSchema = z.object({
  name: z.string().min(1),
  suggestedSlug: z.string().optional(),
  ownerId: z.string().optional(),
});

export type CreateTenantWithSlugResolutionInput = z.infer<typeof CreateTenantWithSlugResolutionInputSchema>;

export type CreateTenantWithSlugResolutionOutput = {
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: string;
};

type CreateTenantWithSlugResolutionCommand = CapabilityCommand<
  CreateTenantWithSlugResolutionInput,
  CreateTenantWithSlugResolutionOutput
>;

export const createTenantWithSlugResolutionCommand: CreateTenantWithSlugResolutionCommand = {
  kind: "command",
  name: "identity.createTenantWithSlugResolution",
  version: "2.1.0", // Added ownerId support, Postgres-backed

  async execute(input: CreateTenantWithSlugResolutionInput) {
    await initIdentitySchema();
    
    const parsed = CreateTenantWithSlugResolutionInputSchema.parse(input);
    const { name, suggestedSlug, ownerId } = parsed;

    const slugBase = suggestedSlug 
      ? slugifyForTenant(suggestedSlug) 
      : slugifyForTenant(name);
    
    let slug = slugBase;
    let counter = 1;
    let existingSlug = await TenantRepositoryPostgres.bySlug(slug);
    while (existingSlug !== undefined) {
      counter += 1;
      slug = `${slugBase}-${counter}`;
      existingSlug = await TenantRepositoryPostgres.bySlug(slug);
    }

    const entity: TenantAggregate = {
      id: newTenantId(),
      name: name.trim(),
      slug,
      ownerId: ownerId ? UserId(ownerId) : undefined as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await TenantRepositoryPostgres.save(entity);

    return {
      tenantId: entity.id,
      name: entity.name,
      slug: entity.slug,
      createdAt: entity.createdAt.toISOString(),
    };
  },
};