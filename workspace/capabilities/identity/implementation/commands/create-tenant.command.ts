import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  TenantId,
  type CreateTenantInput,
  type TenantAggregate,
} from "../contracts/identity.contracts.js";
import { TenantRepositoryPostgres } from "../repositories/index.js";
import { initIdentitySchema } from "../repositories/base.repository.js";

function newTenantId(): TenantId {
  return TenantId(`tenant-${randomUUID()}`);
}

type CreateTenantCommand = CapabilityCommand<
  CreateTenantInput,
  { readonly tenantId: string; readonly name: string; readonly slug: string }
>;

export const createTenantCommand: CreateTenantCommand = {
  kind: "command",
  name: "identity.createTenant",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    // Initialize database schema
    await initIdentitySchema();
    
    const slug = input.slug.trim().toLowerCase();
    const existing = await TenantRepositoryPostgres.bySlug(slug);
    if (existing !== undefined) {
      throw new Error(`[identity.createTenant] Slug already taken: ${slug}`);
    }
    const entity: TenantAggregate = {
      id: newTenantId(),
      name: input.name.trim(),
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await TenantRepositoryPostgres.save(entity);
    return {
      tenantId: entity.id,
      name: entity.name,
      slug: entity.slug,
    };
  },
};