import type { RegionId, RegionKind } from "../regions";
export type LayoutId = string & {
    readonly __layoutId: unique symbol;
};
export declare function LayoutId(s: string): LayoutId;
export interface LayoutRegionPosition {
    readonly region: RegionId;
    readonly kind: RegionKind;
    readonly weight?: number;
    readonly minSizePx?: number;
    readonly maxSizePx?: number;
}
export interface LayoutDescriptor {
    readonly id: LayoutId;
    readonly name: string;
    readonly pattern: "single" | "sidebar-main" | "three-pane" | "tabs" | "master-detail" | "dashboard";
    readonly regions: readonly LayoutRegionPosition[];
}
//# sourceMappingURL=index.d.ts.map