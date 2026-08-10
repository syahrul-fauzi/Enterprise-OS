import {
  MembershipId,
  TenantId,
  UserId,
  WorkspaceId,
  type MembershipAggregate,
  type MembershipRepository,
} from "../contracts/identity.contracts";

type MembershipStore = Map<string, MembershipAggregate>;

const seed = (): MembershipAggregate[] => [
  {
    id: MembershipId("membership-001"),
    userId: UserId("user-001"),
    tenantId: TenantId("tenant-001"),
    workspaceId: WorkspaceId("workspace-001"),
    role: "owner",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: MembershipId("membership-002"),
    userId: UserId("user-002"),
    tenantId: TenantId("tenant-002"),
    workspaceId: WorkspaceId("workspace-002"),
    role: "owner",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

function hydrate(): MembershipStore {
  const s = new Map<string, MembershipAggregate>();
  for (const e of seed()) s.set(e.id, e);
  return s;
}

const MEMBERSHIP_STORE: MembershipStore = hydrate();

export const MembershipRepositoryInMemory: MembershipRepository = Object.freeze({
  entityName: "Membership",
  kind: "repository",

  byId(id: MembershipId): MembershipAggregate | undefined {
    return MEMBERSHIP_STORE.get(id);
  },

  listByUser(userId: UserId): readonly MembershipAggregate[] {
    return [...MEMBERSHIP_STORE.values()].filter((m) => m.userId === userId);
  },

  listByTenant(tenantId: TenantId): readonly MembershipAggregate[] {
    return [...MEMBERSHIP_STORE.values()].filter((m) => m.tenantId === tenantId);
  },

  listByWorkspace(workspaceId: WorkspaceId): readonly MembershipAggregate[] {
    return [...MEMBERSHIP_STORE.values()].filter((m) => m.workspaceId === workspaceId);
  },

  find(
    userId: UserId,
    tenantId: TenantId,
    workspaceId: WorkspaceId,
  ): MembershipAggregate | undefined {
    for (const m of MEMBERSHIP_STORE.values()) {
      if (m.userId === userId && m.tenantId === tenantId && m.workspaceId === workspaceId)
        return m;
    }
    return undefined;
  },

  list(): readonly MembershipAggregate[] {
    return [...MEMBERSHIP_STORE.values()];
  },

  save(entity: MembershipAggregate): MembershipAggregate {
    MEMBERSHIP_STORE.set(entity.id, entity);
    return entity;
  },

  remove(id: MembershipId): boolean {
    return MEMBERSHIP_STORE.delete(id);
  },
});
