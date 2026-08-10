"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepositoryInMemory = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const password_service_1 = require("../services/password.service");
const seed = () => [
    {
        id: (0, identity_contracts_1.UserId)("user-001"),
        email: "alice@eos.dev",
        displayName: "Alice Operator",
        passwordHash: password_service_1.passwordService.hash("password123"),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
        id: (0, identity_contracts_1.UserId)("user-002"),
        email: "bob@eos.dev",
        displayName: "Bob Builder",
        passwordHash: password_service_1.passwordService.hash("password123"),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
];
function hydrate() {
    const s = new Map();
    for (const e of seed())
        s.set(e.id, e);
    return s;
}
const USER_STORE = hydrate();
exports.UserRepositoryInMemory = Object.freeze({
    entityName: "User",
    kind: "repository",
    byId(id) {
        return USER_STORE.get(id);
    },
    byEmail(email) {
        const needle = email.trim().toLowerCase();
        for (const u of USER_STORE.values()) {
            if (u.email.trim().toLowerCase() === needle)
                return u;
        }
        return undefined;
    },
    list() {
        return [...USER_STORE.values()];
    },
    save(entity) {
        USER_STORE.set(entity.id, entity);
        return entity;
    },
    remove(id) {
        return USER_STORE.delete(id);
    },
});
