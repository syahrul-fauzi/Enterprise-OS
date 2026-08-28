//export function deepFreeze<T>(obj: T): Readonly<T> {
//  if (obj === null || obj === undefined) return obj as Readonly<T>;
//  if (typeof obj !== "object") return obj as Readonly<T>;
//  if (Object.isFrozen(obj)) return obj as Readonly<T>;
//  if (Array.isArray(obj)) {
//    for (let i = 0; i < obj.length; i++) deepFreeze((obj as unknown as unknown[])[i]);
//    return Object.freeze(obj) as Readonly<T>;
//  }
//  if (obj instanceof Map) {
//    for (const [, v] of obj.entries()) deepFreeze(v);
//    return Object.freeze(obj) as unknown as Readonly<T>;
//  }
//  if (obj instanceof Set) {
//    for (const v of obj.values()) deepFreeze(v);
//    return Object.freeze(obj) as unknown as Readonly<T>;
//  }
//  const proto = Object.getPrototypeOf(obj);
//  if (proto !== null && proto !== Object.prototype) return Object.freeze(obj) as Readonly<T>;
//  const keys = Object.getOwnPropertyNames(obj);
//  for (const key of keys) {
//    const desc = Object.getOwnPropertyDescriptor(obj, key);
//    if (desc !== undefined && (desc.get !== undefined || desc.set !== undefined)) continue;
//    deepFreeze((obj as unknown as Record<string, unknown>)[key]);
//  }
//  return Object.freeze(obj) as Readonly<T>;
//}
