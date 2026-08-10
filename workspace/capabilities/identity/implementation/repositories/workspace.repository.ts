import {
  TenantId,
  WorkspaceId,
  type WorkspaceAggregate,
  type WorkspaceRepository,
} from "../contracts/identity.contracts";

type WorkspaceStore = Map<string, WorkspaceAggregate>;

const seed = (): WorkspaceAggregate[] => [
  {
    id: WorkspaceId("workspace-001"),
    tenantId: TenantId("tenant-001"),
    name: "Professional Workspace",
    productId: "services-id.default",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: WorkspaceId("workspace-002"),
    tenantId: TenantId("tenant-002"),
    name: "Professional Workspace",
    productId: "lawyershub.default",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

function hydrate(): WorkspaceStore {
  const s = new Map<string, WorkspaceAggregate>();
  for (const e of seed()) s.set(e.id, e);
  return s;
}

const WORKSPACE_STORE: WorkspaceStore = hydrate();

export const WorkspaceRepositoryInMemory: WorkspaceRepository = Object.freeze({
  entityName: "Workspace",
  kind: "repository",

  byId(id: WorkspaceId): WorkspaceAggregate | undefined {
    return WORKSPACE_STORE.get(id);
  },

  listByTenant(tenantId: TenantId): readonly WorkspaceAggregate[] {
    return [...WORKSPACE_STORE.values()].filter((w) => w.tenantId === tenantId);
  },

  list(): readonly WorkspaceAggregate[] {
    return [...WORKSPACE_STORE.values()];
  },

  save(entity: WorkspaceAggregate): WorkspaceAggregate {
    WORKSPACE_STORE.set(entity.id, entity);
    return entity;
  },

  remove(id: WorkspaceId): boolean {
    return WORKSPACE_STORE.delete(id);
  },
});
