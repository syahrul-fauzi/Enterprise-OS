"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalSerializationError = void 0;
exports.canonicalSerialize = canonicalSerialize;
class CanonicalSerializationError extends TypeError {
    kind;
    path;
    constructor(kind, path) {
        super(`canonicalSerialize rejected value at ${path.length === 0 ? "<root>" : path.join(".")}: kind=${kind}. ` +
            `Canonical serialization is pure-value-only; Function/Symbol/WeakMap/WeakSet/Promise/Proxy are forbidden.`);
        this.name = "CanonicalSerializationError";
        this.kind = kind;
        this.path = path;
    }
}
exports.CanonicalSerializationError = CanonicalSerializationError;
function isPlainObject(v) {
    if (v === null || typeof v !== "object")
        return false;
    if (Array.isArray(v))
        return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
}
function isProxy(v) {
    if (v === null || (typeof v !== "object" && typeof v !== "function") || v === undefined)
        return false;
    try {
        const toStringTag = Object.prototype.toString.call(v);
        if (toStringTag === "[object Proxy]")
            return true;
        if ("then" in v)
            return false;
        return false;
    }
    catch {
        return true;
    }
}
function serializeValue(v, path) {
    if (v === null)
        return null;
    if (v === undefined)
        return undefined;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
        return v;
    if (typeof v === "bigint")
        return v.toString();
    if (typeof v === "function")
        throw new CanonicalSerializationError("function", path);
    if (typeof v === "symbol")
        throw new CanonicalSerializationError("symbol", path);
    if (v instanceof Date)
        return v.toISOString();
    if (v instanceof RegExp)
        return v.toString();
    if (v instanceof Promise)
        throw new CanonicalSerializationError("promise", path);
    if (typeof WeakMap !== "undefined" && v instanceof WeakMap)
        throw new CanonicalSerializationError("weakmap", path);
    if (typeof WeakSet !== "undefined" && v instanceof WeakSet)
        throw new CanonicalSerializationError("weakset", path);
    if (isProxy(v))
        throw new CanonicalSerializationError("proxy", path);
    if (Array.isArray(v))
        return v.map((item, i) => serializeValue(item, [...path, String(i)]));
    if (v instanceof Map) {
        const entries = [];
        for (const [k, val] of v.entries())
            entries.push([String(k), serializeValue(val, [...path, String(k)])]);
        entries.sort((a, b) => a[0].localeCompare(b[0]));
        return Object.fromEntries(entries);
    }
    if (v instanceof Set)
        return v.size > 0 ? Array.from(v).map((item, i) => serializeValue(item, [...path, String(i)])).sort((a, b) => String(a).localeCompare(String(b))) : [];
    if (isPlainObject(v)) {
        const keys = Object.keys(v).sort();
        const out = {};
        for (const k of keys)
            out[k] = serializeValue(v[k], [...path, k]);
        return out;
    }
    const tagName = Object.prototype.toString.call(v).slice(8, -1);
    return `[${tagName}]`;
}
function canonicalSerialize(input) {
    const normalized = serializeValue(input, []);
    return JSON.stringify(normalized, undefined, 0);
}
