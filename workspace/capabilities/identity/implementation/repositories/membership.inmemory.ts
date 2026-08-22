import {
  MembershipAggregate,
  MembershipId,
  UserId,
  TenantId,
  WorkspaceId,
  type MembershipRepository,
} from "../contracts/identity.contracts.js";

function clone<T extends MembershipAggregate>(entity: T): T {
  return {
    ...entity,
    joinedAt: new Date(entity.joinedAt),
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  } as T;
}

type Store = Map<string, MembershipAggregate>;

const hydrate = (): Store => new Map<string, MembershipAggregate>();

const STORE: Store = (globalThis as any).__EOS_IDENTITY_MEMBERSHIP_STORE__ ??= hydrate();

export const MembershipRepositoryInMemory: MembershipRepository = {
  kind: "repository",
  entityName: "Membership",
  async byId(id) {
    const raw = STORE.get(id as string);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async listByUser(userId: UserId) {
    return Array.from(STORE.values())
      .filter((m) => m.userId === (userId as string))
      .map(clone);
  },
  async listByTenant(tenantId: TenantId) {
    return Array.from(STORE.values())
      .filter((m) => m.tenantId === (tenantId as string))
      .map(clone);
  },
  async listByWorkspace(workspaceId: WorkspaceId) {
    return Array.from(STORE.values())
      .filter((m) => m.workspaceId === (workspaceId as string))
      .map(clone);
  },
  async list() {
    return Array.from(STORE.values()).map(clone);
  },
  async save(entity) {
    const updated: MembershipAggregate = {
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
