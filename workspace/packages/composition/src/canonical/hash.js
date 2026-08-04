"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fnv1a32 = fnv1a32;
exports.canonicalHashFromJson = canonicalHashFromJson;
exports.fnv1aCombine = fnv1aCombine;
const FNV_OFFSET_BASIS_32 = 2166136261 >>> 0;
const FNV_PRIME_32 = 16777619;
function fnv1a32(s) {
    let h = FNV_OFFSET_BASIS_32;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, FNV_PRIME_32) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
}
function canonicalHashFromJson(json) {
    return {
        algorithm: "fnv1a-32",
        hash: fnv1a32(json),
        sourceLength: json.length,
    };
}
function fnv1aCombine(parts) {
    if (parts.length === 0)
        return fnv1a32("");
    let out = parts[0];
    for (let i = 1; i < parts.length; i++)
        out = `${out}|${parts[i]}`;
    return fnv1a32(out);
}
