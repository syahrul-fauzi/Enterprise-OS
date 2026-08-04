import type { CanonicalJsonString } from "./types";
export type CanonicalRejectKind = "function" | "symbol" | "weakmap" | "weakset" | "promise" | "proxy";
export declare class CanonicalSerializationError extends TypeError {
    readonly kind: CanonicalRejectKind;
    readonly path: readonly string[];
    constructor(kind: CanonicalRejectKind, path: readonly string[]);
}
export declare function canonicalSerialize(input: unknown): CanonicalJsonString;
//# sourceMappingURL=serialize.d.ts.map