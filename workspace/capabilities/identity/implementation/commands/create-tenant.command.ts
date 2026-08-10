import type { CapabilityCommand } from "@repo/core-kernel";
import {
  TenantId,
  type CreateTenantInput,
  type TenantAggregate,
} from "../contracts/identity.contracts";
import { TenantRepositoryInMemory } from "../repositories";

let tenantIdCounter = 100;

function newTenantId(): TenantId {
  tenantIdCounter += 1;
  return TenantId(`tenant-${tenantIdCounter}`);
}

type CreateTenantCommand = CapabilityCommand<
  CreateTenantInput,
  { readonly tenantId: string; readonly name: string; readonly slug: string }
>;

export const createTenantCommand: CreateTenantCommand = {
  kind: "command",
  name: "identity.createTenant",
  version: "1.0.0",

  execute(input) {
    const slug = input.slug.trim().toLowerCase();
    if (TenantRepositoryInMemory.bySlug(slug) !== undefined) {
      throw new Error(`[identity.createTenant] Slug already taken: ${slug}`);
    }
    const entity: TenantAggregate = {
      id: newTenantId(),
      name: input.name.trim(),
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    TenantRepositoryInMemory.save(entity);
    return {
      tenantId: entity.id,
      name: entity.name,
      slug: entity.slug,
    };
  },
};
