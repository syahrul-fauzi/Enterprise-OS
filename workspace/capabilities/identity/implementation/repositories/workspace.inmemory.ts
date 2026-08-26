import {
  WorkspaceAggregate,
  WorkspaceId,
  TenantId,
  type WorkspaceRepository,
} from "../contracts/index";

function clone<T extends WorkspaceAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  } as T;
}

type Store = Map<string, WorkspaceAggregate>;

const hydrate = (): Store => new Map<string, WorkspaceAggregate>();

const STORE: Store = (globalThis as any).__EOS_IDENTITY_WORKSPACE_STORE__ ??= hydrate();

export const WorkspaceRepositoryInMemory: WorkspaceRepository = {
  kind: "repository",
  entityName: "Workspace",
  async byId(id: WorkspaceId) {
    const raw = STORE.get(id as string);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async listByTenant(tenantId: TenantId) {
    return Array.from(STORE.values())
      .filter((w) => w.tenantId === (tenantId as string))
      .map(clone);
  },
  async list() {
    return Array.from(STORE.values()).map(clone);
  },
  async save(entity: WorkspaceAggregate) {
    const updated: WorkspaceAggregate = {
      ...clone(entity),
      updatedAt: new Date(),
    };
    STORE.set(updated.id as string, updated);
    return clone(updated);
  },
  async remove(id: WorkspaceId) {
    return STORE.delete(id as string);
  },
} as const;