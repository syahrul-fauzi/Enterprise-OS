export type {
  CapabilityRegistry,
  DefineCapabilityBindingResult,
  StaticRegistryConfig,
} from "./types";
export type { CapabilityDescriptor } from "./types";
/**
 * @deprecated Renamed to DefineCapabilityBindingResult.
 * Backward compatibility type alias.
 */
export type { DefineWorkspaceResult } from "./types";
export { StaticRegistry, defineCapabilityBinding, defineWorkspace } from "./registry";
