import {
  TenantId,
  type TenantAggregate,
} from "../contracts/identity.contracts";
import { TenantRepositoryPostgres } from "../repositories/index";

export const tenantQueries = Object.freeze({
  async byId(id: string): Promise<TenantAggregate | undefined> {
    return TenantRepositoryPostgres.byId(TenantId(id));
  },

  async bySlug(slug: string): Promise<TenantAggregate | undefined> {
    return TenantRepositoryPostgres.bySlug(slug);
  },

  async list(): Promise<readonly TenantAggregate[]> {
    return TenantRepositoryPostgres.list();
  },

  async count(): Promise<number> {
    const list = await TenantRepositoryPostgres.list();
    return list.length;
  },
});

export type TenantQueries = typeof tenantQueries;