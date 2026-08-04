export type Fnv1a32Hex = string & {
    readonly __fnv1a32: unique symbol;
};
export type CanonicalJsonString = string & {
    readonly __canonicalJson: unique symbol;
};
export interface CanonicalHashEnvelope {
    readonly algorithm: "fnv1a-32";
    readonly hash: Fnv1a32Hex;
    readonly sourceLength: number;
}
//# sourceMappingURL=types.d.ts.map