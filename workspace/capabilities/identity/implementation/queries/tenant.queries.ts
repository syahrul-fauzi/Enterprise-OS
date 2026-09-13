import {
  TenantId,
  type TenantAggregate,
} from "../contracts/identity.contracts.js";
import { getTenantRepositoryPostgres } from "../repositories/index.js";

const tenantRepository = getTenantRepositoryPostgres();

export const tenantQueries = Object.freeze({
  async byId(id: string): Promise<TenantAggregate | undefined> {
    return tenantRepository.byId(TenantId(id));
  },

  async bySlug(slug: string): Promise<TenantAggregate | undefined> {
    return tenantRepository.bySlug(slug);
  },

  async list(): Promise<readonly TenantAggregate[]> {
    return tenantRepository.list();
  },

  async count(): Promise<number> {
    const list = await tenantRepository.list();
    return list.length;
  },
});

export type TenantQueries = typeof tenantQueries;