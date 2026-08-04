import type { CanonicalHashEnvelope, CanonicalJsonString, Fnv1a32Hex } from "./types";
export declare function fnv1a32(s: string): Fnv1a32Hex;
export declare function canonicalHashFromJson(json: CanonicalJsonString): CanonicalHashEnvelope;
export declare function fnv1aCombine(parts: readonly string[]): Fnv1a32Hex;
//# sourceMappingURL=hash.d.ts.map