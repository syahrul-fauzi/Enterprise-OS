import { z } from "zod";
// Re-export types from core-kernel for backward compatibility with existing code
// ONE EOS REALITY: Semua definisi type aslinya tetap di core-kernel, ini hanya alias
export { type WorkId, type TenantId, type ActorId, type SessionId } from "@repo/core-kernel";
// Import ONLY types from core-kernel (ONE EOS REALITY - centralized type definitions)
// Constructor functions tidak dibutuhkan di contracts layer, hanya type definitions
import { type WorkId, type TenantId, type ActorId, type SessionId } from "@repo/core-kernel";

// Use z.BRAND compatible type definition to match atomic-composition contracts
// Only CompositionId remains in work-core (domain-specific composition identifier)
export type CompositionId = string & { __brand: "CompositionId" };
export function CompositionId(value: string): CompositionId { return value as CompositionId; }

export const WorkStatusEnum = ["draft", "active", "suspended", "completed", "cancelled", "observed", "explored", "evaluated", "authorized", "procured", "settled"] as const;
export type WorkStatus = typeof WorkStatusEnum[number];
export const WorkModeEnum = ["core", "domain", "federation", "oneshot"] as const;
export type WorkMode = typeof WorkModeEnum[number];

export interface WorkAggregate {
  id: WorkId;
  workId?: WorkId; // Alias untuk backward compatibility dengan repository yang menggunakan workId
  linkedExpressionId?: string; // Link ke source intent (universal expression) untuk traceability
  title: string;
  description?: string;
  status: WorkStatus;
  mode?: WorkMode;
  workMode?: WorkMode; // Add workMode property required by createCoreWork function (both mode and workMode supported)
  tenantId?: TenantId;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: ActorId;
  updatedBy?: ActorId;
  actorId?: ActorId; // Backward compatibility dengan repository schema
  domainId?: string;
  domainType?: string; // Add missing domainType property required by createCoreWork function
  parentWorkId?: WorkId;
  childWorkIds?: WorkId[]; // Changed from readonly to mutable to fix assignment error
  participants?: string[]; // Changed from readonly to mutable to fix assignment error
  version?: number; // Backward compatibility dengan repository schema
  stateHistory?: unknown[]; // Changed from readonly to mutable to fix assignment error
  compositionId?: string; // Backward compatibility dengan repository schema
  sessionId?: string; // Add for evidence recording context
  workspaceId?: string; // Add for evidence recording context
}

export const ActorIdSchema = z.string().brand("ActorId");
export const TenantIdSchema = z.string().brand("TenantId");
export const SessionIdSchema = z.string().brand("SessionId");
export const WorkIdSchema = z.string().brand("WorkId");

export const WorkSchema = z.object({
  id: WorkIdSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(WorkStatusEnum),
  mode: z.enum(WorkModeEnum),
  tenantId: TenantIdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: ActorIdSchema,
  updatedBy: ActorIdSchema.optional(),
  domainId: z.string().optional(),
  parentWorkId: WorkIdSchema.optional(),
  childWorkIds: z.array(WorkIdSchema),
});