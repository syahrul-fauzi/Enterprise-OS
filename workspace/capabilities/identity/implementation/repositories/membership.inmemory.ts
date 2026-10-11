import {
  type MembershipAggregate,
  type MembershipId,
  type UserId,
  type TenantId,
  type WorkspaceId,
  type WorkId,
  type MembershipRepository,
} from "@repo/contracts-core";

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

const MembershipRepositoryInMemory: MembershipRepository = {
  kind: "repository",
  entityName: "Membership",

  async findByUserTenantAndWorkspace(userId: UserId, tenantId: TenantId, context?: { workspaceId?: WorkspaceId; workId?: WorkId; }): Promise<MembershipAggregate | undefined> {
    return Array.from(STORE.values()).find(m => m.userId === (userId as string) && m.tenantId === (tenantId as string) && m.workspaceId === (context.workspaceId as string));
  },

  async byId(id: MembershipId) {
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
  async listByWorkspace(workspaceId: WorkspaceId, context?: { tenantId?: TenantId; workId?: WorkId; }) {
    return Array.from(STORE.values())
      .filter((m) => {
        if (m.workspaceId !== (workspaceId as string)) return false;
        if (context?.tenantId && m.tenantId !== (context.tenantId as string)) return false;
        if (context?.workId && m.workId !== (context.workId as string)) return false;
        return true;
      })
      .map(clone);
  },
  async list() {
    return Array.from(STORE.values()).map(clone);
  },
  async save(entity: MembershipAggregate) {
    const updated: MembershipAggregate = {
      ...clone(entity),
      updatedAt: new Date(),
    };
    STORE.set(updated.id as string, updated);
    return clone(updated);
  },
  async remove(id: MembershipId) {
    return STORE.delete(id as string);
  },
} as const;
export { MembershipRepositoryInMemory };
export default MembershipRepositoryInMemory;