"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUserCommand = exports.loginUserCommand = exports.createSessionCommand = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const repositories_1 = require("../repositories");
const password_service_1 = require("../services/password.service");
let sessionIdCounter = 100;
function newSessionId() {
    sessionIdCounter += 1;
    return (0, identity_contracts_1.SessionId)(`session-${sessionIdCounter}`);
}
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
exports.createSessionCommand = {
    kind: "command",
    name: "identity.createSession",
    version: "1.0.0",
    execute(input) {
        const ttl = input.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
        const now = new Date();
        const expires = new Date(now.getTime() + ttl * 1000);
        const entity = {
            id: newSessionId(),
            userId: input.userId,
            tenantId: input.tenantId,
            workspaceId: input.workspaceId,
            productId: input.productId,
            actorLabel: input.actorLabel,
            issuedAt: now,
            expiresAt: expires,
            revokedAt: null,
            createdAt: now,
            updatedAt: now,
        };
        repositories_1.SessionRepositoryInMemory.save(entity);
        return {
            sessionId: entity.id,
            userId: entity.userId,
            tenantId: entity.tenantId,
            workspaceId: entity.workspaceId,
            productId: entity.productId,
            actorLabel: entity.actorLabel,
            issuedAt: entity.issuedAt.toISOString(),
            expiresAt: entity.expiresAt.toISOString(),
        };
    },
};
exports.loginUserCommand = {
    kind: "command",
    name: "identity.authenticateUser",
    version: "1.0.0",
    execute(input) {
        const trimmedEmail = input.email.trim().toLowerCase();
        const user = repositories_1.UserRepositoryInMemory.byEmail(trimmedEmail);
        if (user === undefined) {
            return {
                authenticated: false,
                userId: undefined,
                actorId: undefined,
                actorLabel: undefined,
                tenantId: undefined,
                workspaceId: undefined,
                productId: undefined,
                role: undefined,
                session: undefined,
            };
        }
        const ok = password_service_1.passwordService.verify(input.password, user.passwordHash);
        if (!ok) {
            return {
                authenticated: false,
                userId: undefined,
                actorId: undefined,
                actorLabel: undefined,
                tenantId: undefined,
                workspaceId: undefined,
                productId: undefined,
                role: undefined,
                session: undefined,
            };
        }
        const memberships = repositories_1.MembershipRepositoryInMemory.listByUser((0, identity_contracts_1.UserId)(user.id));
        const primary = memberships[0];
        const tenant = primary
            ? repositories_1.TenantRepositoryInMemory.byId(primary.tenantId)
            : undefined;
        const workspace = primary
            ? repositories_1.WorkspaceRepositoryInMemory.byId(primary.workspaceId)
            : undefined;
        const tenantId = primary?.tenantId;
        const workspaceId = primary?.workspaceId;
        const productId = workspace?.productId ?? "services-id.default";
        const role = primary?.role;
        let session = undefined;
        if (tenantId && workspaceId) {
            const sessionResult = exports.createSessionCommand.execute({
                userId: user.id,
                tenantId,
                workspaceId,
                productId,
                actorLabel: user.displayName,
            });
            session = sessionResult;
        }
        return {
            authenticated: true,
            userId: user.id,
            actorId: user.id,
            actorLabel: user.displayName,
            tenantId,
            workspaceId,
            productId,
            role,
            session,
        };
    },
};
exports.authenticateUserCommand = exports.loginUserCommand;
