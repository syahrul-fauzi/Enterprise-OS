import { z } from "zod";

export type WorkId = string & { __brand: "WorkId" };
export type ActorId = string & { __brand: "ActorId" };
export type TenantId = string & { __brand: "TenantId" };
export type SessionId = string & { __brand: "SessionId" };

export function WorkId(value: string): WorkId { return value as WorkId; }
export function ActorId(value: string): ActorId { return value as ActorId; }
export function TenantId(value: string): TenantId { return value as TenantId; }
export function SessionId(value: string): SessionId { return value as SessionId; }

export const WorkStatusEnum = ["draft", "active", "suspended", "completed", "cancelled"] as const;
export type WorkStatus = typeof WorkStatusEnum[number];

export const WorkDomainTypeEnum = ["legal-case", "service-request", "consultation", "generic"] as const;
export type WorkDomainType = typeof WorkDomainTypeEnum[number];

export const BaseWorkAggregateSchema = z.object({
  id: z.string(),
  workId: z.string().brand<WorkId>(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  linkedIntentId: z.string().optional(),
  domainType: z.enum(WorkDomainTypeEnum).default("generic"),
  
  // Session context primitives
  sessionId: z.string().brand<SessionId>(),
  tenantId: z.string().brand<TenantId>(),
  workspaceId: z.string(),
  actorId: z.string().brand<ActorId>(),
  
  // Lifecycle
  status: z.enum(WorkStatusEnum).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export type WorkAggregate = z.infer<typeof BaseWorkAggregateSchema>;