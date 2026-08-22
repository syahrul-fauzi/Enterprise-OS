import {
  TenantAggregate,
  TenantId,
  type TenantRepository,
} from "../contracts/identity.contracts.js";

function clone<T extends TenantAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  } as T;
}

type Store = Map<string, TenantAggregate>;

const hydrate = (): Store => new Map<string, TenantAggregate>();

const STORE: Store = (globalThis as any).__EOS_IDENTITY_TENANT_STORE__ ??= hydrate();

export const TenantRepositoryInMemory: TenantRepository = {
  kind: "repository",
  entityName: "Tenant",
  async byId(id) {
    const raw = STORE.get(id as string);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async bySlug(slug) {
    const needle = slug.trim().toLowerCase();
    const found = Array.from(STORE.values()).find(
      (t) => t.slug.toLowerCase() === needle,
    );
    return found !== undefined ? clone(found) : undefined;
  },
  async list() {
    return Array.from(STORE.values()).map(clone);
  },
  async save(entity) {
    const updated: TenantAggregate = {
      ...clone(entity),
      updatedAt: new Date(),
    };
    STORE.set(updated.id as string, updated);
    return clone(updated);
  },
  async remove(id) {
    return STORE.delete(id as string);
  },
} as const;
