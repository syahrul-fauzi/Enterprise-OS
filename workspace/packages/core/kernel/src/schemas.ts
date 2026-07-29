import { z } from "zod";

export const VersionString = z
  .coerce
  .string()
  .regex(/^\d+(\.\d+){0,2}(-[a-z0-9.-]+)?$/i, "version must be semver");

export const CapabilityId = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]{0,63}$/i,
    "id must be kebab-case (e.g. legal-case)"
  );

export const CapabilityManifestSchema = z.object({
  id: CapabilityId,
  name: z.string().min(1, "name is required"),
  version: VersionString,
  presentation: z
    .object({
      component: z
        .string()
        .min(1, "presentation.component is required (export name)"),
    })
    .optional(),
  implementation: z.object({
    entry: z
      .string()
      .min(1, "implementation.entry is required (module path)"),
  }),
});

export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;

export const CapabilityAggregateBindingSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,63}$/i, "id must be kebab-case"),
  capabilities: z
    .array(CapabilityId)
    .min(1, "at least one capability id is required"),
});

export type CapabilityAggregateBindingManifest = z.infer<typeof CapabilityAggregateBindingSchema>;
