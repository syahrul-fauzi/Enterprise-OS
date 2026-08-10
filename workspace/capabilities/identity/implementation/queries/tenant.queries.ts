import {
  TenantId,
  type TenantAggregate,
} from "../contracts/identity.contracts";
import { TenantRepositoryInMemory } from "../repositories";

export const tenantQueries = Object.freeze({
  byId(id: string): TenantAggregate | undefined {
    return TenantRepositoryInMemory.byId(TenantId(id));
  },

  bySlug(slug: string): TenantAggregate | undefined {
    return TenantRepositoryInMemory.bySlug(slug);
  },

  list(): readonly TenantAggregate[] {
    return TenantRepositoryInMemory.list();
  },

  count(): number {
    return TenantRepositoryInMemory.list().length;
  },
});

export type TenantQueries = typeof tenantQueries;
