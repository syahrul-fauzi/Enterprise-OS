import { requirementWorkspace } from "./workspace.js";

export interface RequirementPermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly grantedByDefault?: boolean;
  readonly scope?: "tenant" | "workspace" | "region" | "slot";
}

export const requirementPermissions: RequirementPermissionRule[] = [
  {
    action: "view",
    resource: "requirement",
    grantedByDefault: true,
    scope: "workspace",
  },
  {
    action: "create",
    resource: "requirement",
    grantedByDefault: true,
    scope: "workspace",
  },
  {
    action: "update",
    resource: "requirement",
    grantedByDefault: true,
    scope: "workspace",
  },
  {
    action: "verify",
    resource: "requirement",
    grantedByDefault: false,
    scope: "workspace",
  },
];

export const requirementWorkspacePermissions = {
  workspaceId: requirementWorkspace.id,
  rules: requirementPermissions,
} as const;