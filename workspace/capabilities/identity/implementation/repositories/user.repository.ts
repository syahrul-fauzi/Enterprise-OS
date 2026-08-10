import {
  UserId,
  type UserAggregate,
  type UserRepository,
} from "../contracts/identity.contracts";
import { passwordService } from "../services/password.service";

type UserStore = Map<string, UserAggregate>;

const seed = (): UserAggregate[] => [
  {
    id: UserId("user-001"),
    email: "alice@eos.dev",
    displayName: "Alice Operator",
    passwordHash: passwordService.hash("password123"),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: UserId("user-002"),
    email: "bob@eos.dev",
    displayName: "Bob Builder",
    passwordHash: passwordService.hash("password123"),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

function hydrate(): UserStore {
  const s = new Map<string, UserAggregate>();
  for (const e of seed()) s.set(e.id, e);
  return s;
}

const USER_STORE: UserStore = hydrate();

export const UserRepositoryInMemory: UserRepository = Object.freeze({
  entityName: "User",
  kind: "repository",

  byId(id: UserId): UserAggregate | undefined {
    return USER_STORE.get(id);
  },

  byEmail(email: string): UserAggregate | undefined {
    const needle = email.trim().toLowerCase();
    for (const u of USER_STORE.values()) {
      if (u.email.trim().toLowerCase() === needle) return u;
    }
    return undefined;
  },

  list(): readonly UserAggregate[] {
    return [...USER_STORE.values()];
  },

  save(entity: UserAggregate): UserAggregate {
    USER_STORE.set(entity.id, entity);
    return entity;
  },

  remove(id: UserId): boolean {
    return USER_STORE.delete(id);
  },
});
