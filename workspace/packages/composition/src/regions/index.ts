import type { SlotId } from "../slots";

export type RegionId = string & { readonly __regionId: unique symbol };
export function RegionId(s: string): RegionId {
  return s as RegionId;
}

export type RegionKind =
  | "app-header"
  | "app-footer"
  | "app-sidebar"
  | "main"
  | "workspace"
  | "detail"
  | "inspector"
  | "modal"
  | "drawer";

export interface RegionDescriptor {
  readonly id: RegionId;
  readonly kind: RegionKind;
  readonly name: string;
  readonly slots: readonly SlotId[];
  readonly collapsible?: boolean;
  readonly resizable?: boolean;
  readonly defaultOpen?: boolean;
  readonly layoutHint?: "row" | "column" | "grid";
}


