"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSessionCommand = exports.logoutUserCommand = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const repositories_1 = require("../repositories");
exports.logoutUserCommand = {
    kind: "command",
    name: "identity.logoutUser",
    version: "1.0.0",
    execute(input) {
        if (!input.sessionId) {
            return { ok: true };
        }
        const sid = (0, identity_contracts_1.SessionId)(input.sessionId);
        const existing = repositories_1.SessionRepositoryInMemory.byId(sid);
        if (existing === undefined) {
            return { ok: true };
        }
        const revoked = repositories_1.SessionRepositoryInMemory.revoke(sid);
        return {
            ok: true,
            revokedSessionId: revoked.id,
            revokedAt: revoked.revokedAt?.toISOString(),
        };
    },
};
exports.revokeSessionCommand = exports.logoutUserCommand;
