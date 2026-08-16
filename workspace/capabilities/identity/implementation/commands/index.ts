import type { CapabilityCommand } from "@repo/core-kernel";
import { createUserCommand } from "./create-user.command";
import { loginUserCommand, createSessionCommand } from "./login-user.command";
import { logoutUserCommand } from "./logout-user.command";
import { createTenantCommand } from "./create-tenant.command";
import { createWorkspaceCommand } from "./create-workspace.command";
import { createMembershipCommand } from "./create-membership.command";
import { signupFlowCommand } from "./signup-flow.command";
import { createTenantWithSlugResolutionCommand } from "./create-tenant-with-slug-resolution.command";
import { getTenantByIdCommand } from "./get-tenant-by-id.command";
import { getWorkspacesByTenantCommand } from "./get-workspaces-by-tenant.command";
import { loginFlowCommand } from "./login-flow.command";
import { getWorkspaceByIdCommand } from "./get-workspace-by-id.command";
import { createWorkspaceFlowCommand } from "./create-workspace-flow.command";
import { getMemberByIdCommand } from "./get-member-by-id.command";
import { getMembersByInstitutionCommand } from "./get-members-by-institution.command";
import { signupAndSessionCommand } from "./signup-and-session.command";
import { getSessionByIdCommand } from "./get-session-by-id.command";

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

export * from "./create-user.command";
export * from "./login-user.command";
export * from "./logout-user.command";
export * from "./create-tenant.command";
export * from "./create-workspace.command";
export * from "./create-membership.command";
export * from "./signup-flow.command";
export * from "./create-tenant-with-slug-resolution.command";