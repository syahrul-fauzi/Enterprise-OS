import type { CanonicalHashEnvelope, CanonicalJsonString, Fnv1a32Hex } from "./types.js";

const FNV_OFFSET_BASIS_32 = 2166136261 >>> 0;
const FNV_PRIME_32 = 16777619;

export function fnv1a32(s: string): Fnv1a32Hex {
  let h = FNV_OFFSET_BASIS_32;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME_32) >>> 0;
  }
  return h.toString(16).padStart(8, "0") as Fnv1a32Hex;
}

export function canonicalHashFromJson(json: CanonicalJsonString): CanonicalHashEnvelope {
  return {
    algorithm: "fnv1a-32",
    hash: fnv1a32(json),
    sourceLength: json.length,
  } as const;
}

export function fnv1aCombine(parts: readonly string[]): Fnv1a32Hex {
  if (parts.length === 0) return fnv1a32("");
  let out = parts[0] ?? "";
  for (let i = 1; i < parts.length; i++) out = `${out}|${parts[i] ?? ""}`;
  return fnv1a32(out);
}
