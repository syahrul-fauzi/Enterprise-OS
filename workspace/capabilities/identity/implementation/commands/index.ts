import type { CapabilityCommand } from "@repo/core-kernel";
import { createUserCommand } from "./create-user.command.js";
import { loginUserCommand, createSessionCommand } from "./login-user.command.js";
import { logoutUserCommand } from "./logout-user.command.js";
import { createTenantCommand } from "./create-tenant.command.js";
import { createWorkspaceCommand } from "./create-workspace.command.js";
import { createMembershipCommand } from "./create-membership.command.js";
import { signupFlowCommand } from "./signup-flow.command.js";
import { createTenantWithSlugResolutionCommand } from "./create-tenant-with-slug-resolution.command.js";
import { getTenantByIdCommand } from "./get-tenant-by-id.command.js";
import { getWorkspacesByTenantCommand } from "./get-workspaces-by-tenant.command.js";
import { loginFlowCommand } from "./login-flow.command.js";
import { getWorkspaceByIdCommand } from "./get-workspace-by-id.command.js";
import { createWorkspaceFlowCommand } from "./create-workspace-flow.command.js";
import { getMemberByIdCommand } from "./get-member-by-id.command.js";
import { getMembersByInstitutionCommand } from "./get-members-by-institution.command.js";
import { signupAndSessionCommand } from "./signup-and-session.command.js";
import { getSessionByIdCommand } from "./get-session-by-id.command.js";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.registerUser": createUserCommand,
  "identity.authenticateUser": loginUserCommand,
  "identity.logoutUser": logoutUserCommand,
  "identity.createTenant": createTenantCommand,
  "identity.createTenantWithSlugResolution": createTenantWithSlugResolutionCommand,
  "identity.getTenantById": getTenantByIdCommand,
  "identity.getWorkspacesByTenant": getWorkspacesByTenantCommand,
  "identity.loginFlow": loginFlowCommand,
  "identity.getWorkspaceById": getWorkspaceByIdCommand,
  "identity.createWorkspaceFlow": createWorkspaceFlowCommand,
  "identity.getMemberById": getMemberByIdCommand,
  "identity.getMembersByInstitution": getMembersByInstitutionCommand,
  "identity.createWorkspace": createWorkspaceCommand,
  "identity.createMembership": createMembershipCommand,
  "identity.createSession": createSessionCommand,
  "identity.signupFlow": signupFlowCommand,
  "identity.signupAndCreateSession": signupAndSessionCommand,
  "identity.getSessionById": getSessionByIdCommand,
} as const;

export * from "./create-user.command.js";
export * from "./login-user.command.js";
export * from "./logout-user.command.js";
export * from "./create-tenant.command.js";
export * from "./create-workspace.command.js";
export * from "./create-membership.command.js";
export * from "./signup-flow.command.js";
export * from "./create-tenant-with-slug-resolution.command.js";