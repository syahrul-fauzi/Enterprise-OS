import { z } from "zod";
import type { CompositionId } from "@capabilities/atomic-composition/implementation/contracts/atomic-composition.contracts.js";

export type WorkId = string & { __brand: "WorkId" };
export type TenantId = string & { __brand: "TenantId" };
export type SessionId = string & { __brand: "SessionId" };
export type ActorId = string & { __brand: "ActorId" }; // Canonical actor ID from identity layer

export function WorkId(value: string): WorkId { return value as WorkId; }
export function TenantId(value: string): TenantId { return value as TenantId; }
export function SessionId(value: string): SessionId { return value as SessionId; }
export function ActorId(value: string): ActorId { return value as ActorId; }

export const WorkStatusEnum = ["draft", "active", "suspended", "completed", "cancelled"] as const;
export type WorkStatus = typeof WorkStatusEnum[number];

export const WorkDomainTypeEnum = ["legal-case", "service-request", "consultation", "ecommerce-order", "software-development", "generic"] as const;
export type WorkDomainType = typeof WorkDomainTypeEnum[number];

export const WorkModeEnum = ["oneshot", "project", "continuous", "monitoring", "inspection", "investigation", "operation", "assistance"] as const;
export type WorkMode = typeof WorkModeEnum[number];

export const BaseWorkAggregateSchema = z.object({
  id: z.string(),
  workId: z.string().brand<WorkId>(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  linkedIntentId: z.string().optional(),
  domainType: z.enum(WorkDomainTypeEnum).default("generic"),
  workMode: z.enum(WorkModeEnum).default("oneshot"),
  
  // External system integration (R5-C Platform Specialization)
  externalId: z.string().optional(), // ID from external system to preserve identity
  platformSource: z.string().optional(), // Which external platform this work originated from
  platformMetadata: z.record(z.string(), z.any()).optional(), // Platform-specific metadata (repository name, etc.)
  
  // Session context primitives
  sessionId: z.string().brand<SessionId>(),
  tenantId: z.string().brand<TenantId>(),
  workspaceId: z.string(),
  actorId: z.string().brand<ActorId>(),
  
  // ATOMIC WORK COMPOSITION - CANONICAL INTEGRATION
  // CONSTITUTIONAL DECISION: Work.teamId REMOVED - only compositionId remains
  // To reconstruct team: load TeamProjection from composition using compositionId
  // Team is NEVER a first-class relation - always derived projection from composition
  requiredCapabilities: z.array(z.string()).default([]), // core capability references
  compositionId: z.string().brand<CompositionId>().optional(), // ONLY canonical link
  
  // Lifecycle
  status: z.enum(WorkStatusEnum).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  completedAt: z.string().optional(),
  
  // RL2-001: Work Execution Reality extensions - state transition tracking
  assignedActorId: z.string().brand<ActorId>().optional(),
  nextAction: z.string().optional(),
  stateHistory: z.array(z.object({
    status: z.enum(WorkStatusEnum),
    timestamp: z.string(),
    actorId: z.string().brand<ActorId>(),
    note: z.string().optional()
  })).default([]),
  // RL3-001: Economic Value Proof extensions - track measurable value created by work
  economicValue: z.object({
    amount: z.number().optional(), // Measurable monetary value
    currency: z.string().default("IDR"),
    valueType: z.enum(["cost_savings", "revenue_generated", "risk_mitigation", "efficiency_gain"]).optional(),
    evidence: z.string().optional(), // Reference to value evidence in evidence registry
    recordedAt: z.string().optional() // Timestamp when value was recorded
  }).optional(),
  outcomeDeliveredAt: z.string().optional(), // RL3: Timestamp when final outcome was delivered
});

export type WorkAggregate = z.infer<typeof BaseWorkAggregateSchema>;