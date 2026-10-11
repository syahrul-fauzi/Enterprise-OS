import { caseWorkspace } from "./workspace.js";

export interface CasePermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly grantedByDefault?: boolean;
  readonly scope?: "tenant" | "workspace" | "region" | "slot";
}

export const casePermissions: CasePermissionRule[] = [
  {
    action: "view",
    resource: "case",
    grantedByDefault: true,
    scope: "workspace",
  },
  {
    action: "create",
    resource: "case",
    grantedByDefault: false,
    scope: "workspace",
  },
  {
    action: "assign",
    resource: "case",
    grantedByDefault: false,
    scope: "tenant",
  },
  {
    action: "approve-ruling",
    resource: "case",
    grantedByDefault: false,
    scope: "tenant",
    allowedActors: ["judge.test.001", "ai.judge.001"], // AI-001: AI judge actor authorized for approval
  },
  {
    action: "close",
    resource: "case",
    grantedByDefault: false,
    scope: "workspace",
  },
];

export const caseWorkspacePermissions = {
  workspaceId: caseWorkspace.id,
  rules: casePermissions,
} as const;