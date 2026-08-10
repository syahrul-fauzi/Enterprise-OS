"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserCommand = exports.createUserCommand = void 0;
const identity_contracts_1 = require("../contracts/identity.contracts");
const repositories_1 = require("../repositories");
const password_service_1 = require("../services/password.service");
let userIdCounter = 100;
function newUserId() {
    userIdCounter += 1;
    return (0, identity_contracts_1.UserId)(`user-${userIdCounter}`);
}
exports.createUserCommand = {
    kind: "command",
    name: "identity.registerUser",
    version: "1.0.0",
    execute(input) {
        const trimmedEmail = input.email.trim().toLowerCase();
        if (repositories_1.UserRepositoryInMemory.byEmail(trimmedEmail) !== undefined) {
            throw new Error(`[identity.registerUser] Email already registered: ${trimmedEmail}`);
        }
        const entity = {
            id: newUserId(),
            email: trimmedEmail,
            displayName: input.displayName.trim(),
            passwordHash: password_service_1.passwordService.hash(input.password),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        repositories_1.UserRepositoryInMemory.save(entity);
        return {
            userId: entity.id,
            actorId: entity.id,
            actorLabel: entity.displayName,
            email: entity.email,
        };
    },
};
exports.registerUserCommand = exports.createUserCommand;
