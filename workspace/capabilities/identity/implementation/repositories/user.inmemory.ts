import {
  UserAggregate,
  UserId,
  type UserRepository,
} from "../contracts/index";

const seed = (): UserAggregate[] => [
  {
    id: UserId("user-001"),
    email: "demo@lawyershub.example",
    displayName: "Demo User",
    passwordHash: "$2a$10$...", // Placeholder - never store real passwords in seed
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
];

type Store = Map<string, UserAggregate>;

function hydrate(): Store {
  const store = new Map<string, UserAggregate>();
  for (const u of seed()) {
    store.set(u.id, u);
  }
  return store;
}

const STORE: Store = hydrate();

function clone<T extends UserAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  } as T;
}

export const UserRepositoryInMemory: UserRepository = {
  kind: "repository",
  entityName: "User",
  async byId(id: UserId) {
    const raw = STORE.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async byEmail(email: string) {
    const raw = Array.from(STORE.values()).find(u => u.email === email);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async list() {
    return Array.from(STORE.values()).map(clone);
  },
  async save(entity: UserAggregate) {
    const updated: UserAggregate = { ...clone(entity), updatedAt: new Date() };
    STORE.set(updated.id, updated);
    return clone(updated);
  },
  async remove(id: UserId) {
    return STORE.delete(id);
  },
} as const;

export const newUserId = (() => {
  let seq = 100;
  return (): UserId => {
    seq += 1;
    return UserId(`user-${String(seq).padStart(3, "0")}`);
  };
})();