//import type { SlotId } from "../slots/index.js";
//
//export type NavigationItemKind =
//  | "link"
//  | "group"
//  | "separator"
//  | "action"
//  | "workspace-switcher"
//  | "capability";
//
//export interface NavigationItem {
//  readonly id: string;
//  readonly label: string;
//  readonly kind: NavigationItemKind;
//  readonly iconName?: string;
//  readonly capabilityId?: string;
//  readonly workspaceId?: string;
//  readonly href?: string;
//  readonly command?: string;
//  readonly children?: readonly NavigationItem[];
//  readonly targetSlot?: SlotId;
//  readonly order?: number;
//  readonly groups?: readonly string[];
//}
//
//export interface NavigationDescriptor {
//  readonly id: string;
//  readonly name: string;
//  readonly kind: "primary" | "secondary" | "context" | "global" | "breadcrumbs";
//  readonly items: readonly NavigationItem[];
//}
//
//
