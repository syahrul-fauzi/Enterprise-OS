
import { z } from 'zod';

// As per ACCEPTANCE_CRITERIA.md
export const ContainerStatusSchema = z.enum([
  'provisioned',
  'in_transit',
  'stalled',
  'arrived',
  'decommissioned',
]);
export type ContainerStatus = z.infer<typeof ContainerStatusSchema>;

export const LocationPointSchema = z.object({
  timestamp: z.string().datetime(),
  lat: z.number(),
  long: z.number(),
});
export type LocationPoint = z.infer<typeof LocationPointSchema>;

export const ContainerTrackingDataSchema = z.object({
  work_id: z.string(),
  container_id: z.string(),
  status: ContainerStatusSchema,
  location_history: z.array(LocationPointSchema),
  last_updated: z.string().datetime(),
});
export type ContainerTrackingData = z.infer<typeof ContainerTrackingDataSchema>;

// Schema for the 'provision' command
export const ProvisionContainerInputSchema = z.object({
  work_id: z.string(),
  container_id: z.string(),
});
export type ProvisionContainerInput = z.infer<typeof ProvisionContainerInputSchema>;

// Schema for the 'updateStatus' command (from webhook)
export const UpdateStatusInputSchema = z.object({
  container_id: z.string(),
  timestamp: z.string().datetime(),
  lat: z.number(),
  long: z.number(),
  // Optional status from the provider, can be mapped to our internal status
  provider_status: z.string().optional(),
});
export type UpdateStatusInput = z.infer<typeof UpdateStatusInputSchema>;