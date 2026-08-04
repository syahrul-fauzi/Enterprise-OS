"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepFreeze = deepFreeze;
function deepFreeze(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj !== "object")
        return obj;
    if (Object.isFrozen(obj))
        return obj;
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++)
            deepFreeze(obj[i]);
        return Object.freeze(obj);
    }
    if (obj instanceof Map) {
        for (const [, v] of obj.entries())
            deepFreeze(v);
        return Object.freeze(obj);
    }
    if (obj instanceof Set) {
        for (const v of obj.values())
            deepFreeze(v);
        return Object.freeze(obj);
    }
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null && proto !== Object.prototype)
        return Object.freeze(obj);
    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc !== undefined && (desc.get !== undefined || desc.set !== undefined))
            continue;
        deepFreeze(obj[key]);
    }
    return Object.freeze(obj);
}
