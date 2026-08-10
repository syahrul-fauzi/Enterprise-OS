"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityCommands = void 0;
const create_user_command_1 = require("./create-user.command");
const login_user_command_1 = require("./login-user.command");
const logout_user_command_1 = require("./logout-user.command");
const create_tenant_command_1 = require("./create-tenant.command");
const create_workspace_command_1 = require("./create-workspace.command");
const create_membership_command_1 = require("./create-membership.command");
exports.identityCommands = {
    "identity.registerUser": create_user_command_1.createUserCommand,
    "identity.authenticateUser": login_user_command_1.loginUserCommand,
    "identity.logoutUser": logout_user_command_1.logoutUserCommand,
    "identity.createTenant": create_tenant_command_1.createTenantCommand,
    "identity.createWorkspace": create_workspace_command_1.createWorkspaceCommand,
    "identity.createMembership": create_membership_command_1.createMembershipCommand,
    "identity.createSession": login_user_command_1.createSessionCommand,
};
__exportStar(require("./create-user.command"), exports);
__exportStar(require("./login-user.command"), exports);
__exportStar(require("./logout-user.command"), exports);
__exportStar(require("./create-tenant.command"), exports);
__exportStar(require("./create-workspace.command"), exports);
__exportStar(require("./create-membership.command"), exports);
