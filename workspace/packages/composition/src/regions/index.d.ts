import type { SlotId } from "../slots";
export type RegionId = string & {
    readonly __regionId: unique symbol;
};
export declare function RegionId(s: string): RegionId;
export type RegionKind = "app-header" | "app-footer" | "app-sidebar" | "main" | "workspace" | "detail" | "inspector" | "modal" | "drawer";
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
//# sourceMappingURL=index.d.ts.map