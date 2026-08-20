import { CapabilityAggregateBindingSchema } from "./schemas.js";
import type { CapabilityAggregateBindingManifest } from "./schemas.js";
import type {
  CapabilityRegistry,
  DefineCapabilityBindingResult,
  StaticRegistryConfig,
} from "./types.js";
import type { CapabilityDescriptor } from "./types.js";

export class StaticRegistry implements CapabilityRegistry {
  readonly kind = "static";
  private entries: Map<string, CapabilityDescriptor>;

  constructor(config: StaticRegistryConfig) {
    this.entries = new Map(Object.entries(config.entries));
  }

  resolve(id: string): CapabilityDescriptor | undefined {
    return this.entries.get(id);
  }

  list(): CapabilityDescriptor[] {
    return Array.from(this.entries.values());
  }

  validate():
    | { ok: true }
    | { ok: false; errors: Array<{ id?: string; error: Error }> } {
    const errors: Array<{ id?: string; error: Error }> = [];
    const seenIds = new Set<string>();
    for (const desc of this.entries.values()) {
      if (!desc || typeof desc !== "object") {
        errors.push({ error: new Error(`invalid descriptor object`) });
        continue;
      }
      if (!desc.id || typeof desc.id !== "string") {
        errors.push({ error: new Error(`capability descriptor missing id`) });
        continue;
      }
      if (seenIds.has(desc.id)) {
        errors.push({
          id: desc.id,
          error: new Error(`duplicate capability "${desc.id}" registered`),
        });
        continue;
      }
      seenIds.add(desc.id);
      if (!desc.version || typeof desc.version !== "string") {
        errors.push({
          id: desc.id,
          error: new Error(`capability "${desc.id}" missing version`),
        });
      }
      if (!desc.name || typeof desc.name !== "string") {
        errors.push({
          id: desc.id,
          error: new Error(`capability "${desc.id}" missing name`),
        });
      }
      if (desc.presentation !== undefined) {
        const pres = desc.presentation as { view?: unknown };
        if (typeof pres !== "object" || typeof pres.view !== "function") {
          errors.push({
            id: desc.id,
            error: new Error(
              `capability "${desc.id}" presentation.view must be a component constructor function`
            ),
          });
        }
      } else if ((desc as { experience?: unknown }).experience !== undefined) {
        const exp = (desc as { experience?: unknown }).experience as { view?: unknown };
        if (typeof exp !== "object" || typeof exp.view !== "function") {
          errors.push({
            id: desc.id,
            error: new Error(
              `capability "${desc.id}" presentation.view must be a component constructor function`
            ),
          });
        }
      }
    }
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true };
  }
}

export function defineCapabilityBinding(
  definition: CapabilityAggregateBindingManifest
): DefineCapabilityBindingResult<CapabilityAggregateBindingManifest> {
  const frozen = Object.freeze({
    id: definition.id,
    capabilities: Object.freeze([...definition.capabilities]),
  }) as unknown as CapabilityAggregateBindingManifest;
  return {
    definition: frozen,
    validate() {
      const parsed = CapabilityAggregateBindingSchema.safeParse(frozen);
      if (!parsed.success) {
        return { ok: false, error: new Error(parsed.error.message) };
      }
      return { ok: true };
    },
  };
}

/**
 * @deprecated Renamed to defineCapabilityBinding.
 * "Workspace" = vocabulary presentation-level yang tidak seharusnya menjadi
 * nama symbol utama di foundation registry layer. Backward compatibility
 * export untuk konsumen lama yang belum migrasi.
 */
export const defineWorkspace = defineCapabilityBinding;