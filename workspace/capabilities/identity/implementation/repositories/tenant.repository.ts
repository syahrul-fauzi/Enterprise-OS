import {
  TenantId,
  type TenantAggregate,
  type TenantRepository,
} from "../contracts/identity.contracts";

type TenantStore = Map<string, TenantAggregate>;

const seed = (): TenantAggregate[] => [
  {
    id: TenantId("tenant-001"),
    name: "Alice Personal",
    slug: "alice-personal",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: TenantId("tenant-002"),
    name: "Bob Personal",
    slug: "bob-personal",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

function hydrate(): TenantStore {
  const s = new Map<string, TenantAggregate>();
  for (const e of seed()) s.set(e.id, e);
  return s;
}

const TENANT_STORE: TenantStore = hydrate();

export const TenantRepositoryInMemory: TenantRepository = Object.freeze({
  entityName: "Tenant",
  kind: "repository",

  byId(id: TenantId): TenantAggregate | undefined {
    return TENANT_STORE.get(id);
  },

  bySlug(slug: string): TenantAggregate | undefined {
    const needle = slug.trim().toLowerCase();
    for (const t of TENANT_STORE.values()) {
      if (t.slug.trim().toLowerCase() === needle) return t;
    }
    return undefined;
  },

  list(): readonly TenantAggregate[] {
    return [...TENANT_STORE.values()];
  },

  save(entity: TenantAggregate): TenantAggregate {
    TENANT_STORE.set(entity.id, entity);
    return entity;
  },

  remove(id: TenantId): boolean {
    return TENANT_STORE.delete(id);
  },
});
