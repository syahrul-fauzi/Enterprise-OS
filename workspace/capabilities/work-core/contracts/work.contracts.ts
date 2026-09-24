import { z } from "zod";
// Gunakan path mapping @repo/capabilities-identity yang sudah terkonfigurasi di tsconfig.json work-core
// Sesuai dengan NodeNext module resolution dan arsitektur monorepo yang benar
import {
  type WorkId,
  type TenantId,
  type ActorId,
  type SessionId,
  type UserId,
  type MembershipRepository,
  type SessionRepository
} from "@repo/capabilities-identity";
// Export ulang type agar bisa diimport oleh layer lain dari work.contracts.ts (sesuai contract pattern)
export {
  type WorkId,
  type TenantId,
  type ActorId,
  type SessionId,
  type UserId,
  type MembershipRepository,
  type SessionRepository
} from "@repo/capabilities-identity";

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
  workId?: string; // Kompatibilitas dengan repository mapping
  compositionId: CompositionId;
  tenantId: TenantId;
  workspaceId: string;
  actorId: ActorId;
  sessionId: SessionId;
  title: string;
  description?: string;
  status: WorkStatus;
  mode: WorkMode;
  domainType?: string; // Tambahkan domainType untuk kompatibilitas backward
  version?: number;
  participants?: string[];
  linkedExpressionId?: string;
  stateHistory?: unknown[];
  createdAt: Readonly<Date>;
  updatedAt: Readonly<Date>;
}