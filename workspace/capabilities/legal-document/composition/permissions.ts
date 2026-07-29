import { documentWorkspace } from "./workspace";

export interface DocumentPermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly grantedByDefault?: boolean;
  readonly scope?: "tenant" | "workspace" | "region" | "slot";
}

export const documentPermissions: DocumentPermissionRule[] = [
  {
    action: "view",
    resource: "document",
    grantedByDefault: true,
    scope: "workspace",
  },
  {
    action: "create",
    resource: "document",
    grantedByDefault: false,
    scope: "workspace",
  },
  {
    action: "sign",
    resource: "document",
    grantedByDefault: false,
    scope: "tenant",
  },
  {
    action: "archive",
    resource: "document",
    grantedByDefault: false,
    scope: "workspace",
  },
  {
    action: "update",
    resource: "document",
    grantedByDefault: false,
    scope: "workspace",
  },
];

export const documentWorkspacePermissions = {
  workspaceId: documentWorkspace.id,
  rules: documentPermissions,
} as const;
