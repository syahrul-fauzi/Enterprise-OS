import type { CapabilityCommand } from "@repo/core-kernel";
import { createUserCommand } from "./create-user.command";
import { loginUserCommand, createSessionCommand } from "./login-user.command";
import { logoutUserCommand } from "./logout-user.command";
import { createTenantCommand } from "./create-tenant.command";
import { createWorkspaceCommand } from "./create-workspace.command";
import { createMembershipCommand } from "./create-membership.command";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.registerUser": createUserCommand,
  "identity.authenticateUser": loginUserCommand,
  "identity.logoutUser": logoutUserCommand,
  "identity.createTenant": createTenantCommand,
  "identity.createWorkspace": createWorkspaceCommand,
  "identity.createMembership": createMembershipCommand,
  "identity.createSession": createSessionCommand,
} as const;

export * from "./create-user.command";
export * from "./login-user.command";
export * from "./logout-user.command";
export * from "./create-tenant.command";
export * from "./create-workspace.command";
export * from "./create-membership.command";
