//export type SlotId = string & { readonly __slotId: unique symbol };
//export function SlotId(s: string): SlotId {
//  return s as SlotId;
//}
//
//export interface SlotDescriptor {
//  readonly id: SlotId;
//  readonly name: string;
//  readonly purpose: "content" | "chrome" | "navigation" | "toolbar" | "status" | "sidebar";
//  readonly single?: boolean;
//  readonly required?: boolean;
//  readonly capabilityIds?: readonly string[];
//  readonly defaultExperience?: {
//    readonly capabilityId: string;
//    readonly view?: string;
//  };
//}
//
//export interface SlotInstance {
//  readonly slot: SlotId;
//  readonly capabilityId: string;
//  readonly view?: string;
//  readonly priority?: number;
//}
//
//
