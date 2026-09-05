import { z } from "zod";
import type { WorkId } from "@capabilities/work-core/contracts/work.contracts.js";
import type { WorkActor } from "@capabilities/work-inspection/implementation/contracts/work-inspection.contracts.js";
import type { UserId, UserAggregate } from "@capabilities/identity/implementation/contracts/identity.contracts.js";

// ============================================================================
// ATOMIC WORK COMPOSITION - PRIMITIVE DEFINITIONS
// Canonical Integration Layer: References existing EOS Core primitives
// No duplicate semantics - All base entities extend canonical EOS Core
// ============================================================================

// ------------------------------
// 1. CAPABILITY REQUIREMENT - NOT duplicate of core capability!
// Reference to core capability + work-specific requirement metadata
// Layer 2: Composition-specific projection, NOT new primitive
// ------------------------------
export const CapabilityRequirementSchema = z.object({
  id: z.string(),
  requirementId: z.string().brand<"RequirementId">(),
  workId: z.string().brand<"WorkId">(),
  // References canonical core capability ID (no duplicate capability definition)
  capabilityReference: z.string(), // core capability registry ID
  quantity: z.number().default(1),
  minimumTrust: z.enum(["any", "verified", "trusted", "certified"]).default("verified"),
  authority: z.enum(["view", "comment", "execute", "approve", "admin"]).default("execute"),
  evidenceRequired: z.string().optional(),
  resolved: z.boolean().default(false),
  createdAt: z.string(),
});

export type CapabilityRequirement = z.infer<typeof CapabilityRequirementSchema>;
export type RequirementId = string & { __brand: "RequirementId" };
export function RequirementId(value: string): RequirementId { return value as RequirementId; }

export interface Requirement {
  requirementId: RequirementId;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  capabilityId: string;
  assignedActorId?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------
// 2. ACTOR PROJECTION - Extended from canonical identity User + WorkActor
// Layer 2: Composition-specific projection of core Actor/Identity
// No duplicate Actor - just adds composition-specific metadata
// ------------------------------
// E1 CAPABILITY PROVIDER ECONOMY AUDIT - Supported provider types
// All 5 provider types explicitly supported by Atomic Work Composition
// No core identity system changes required - Layer 2 projection only
export const ProviderTypeSchema = z.enum([
  "human-professional",   // Human Professional
  "ai-agent",             // AI Agent
  "external-service",     // External Service/API
  "organization",         // Organization
  "machine-device"        // Machine/Device
]);

export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export const ActorProjectionSchema = z.object({
  // Extend canonical identity (user from identity capability)
  userId: z.string().brand<"UserId">(), // links directly to core identity
  // Extend work-inspection's WorkActor
  workActor: z.custom<WorkActor>(),
  // E1: Explicit provider type for Capability Provider Economy Audit
  providerType: ProviderTypeSchema.default("human-professional"),
  // Composition-specific additions ONLY
  capabilities: z.array(z.string()).default([]), // references to core capability IDs
  availability: z.boolean().default(true),
  // Keep compatibility with existing code but remove duplicate Actor definition
  actorId: z.string().brand<"ActorId">(), // derived from userId for composition context
});

export type ActorProjection = z.infer<typeof ActorProjectionSchema>;
export type ActorId = string & { __brand: "ActorId" };
export function ActorId(value: string): ActorId { return value as ActorId; }

// ------------------------------
// 3. WORK BINDING - Canonical Layer 2 primitive: assignment of actor projection to requirement
// The ONLY new primitive that didn't exist in EOS Core before
// ------------------------------
export const WorkBindingSchema = z.object({
  id: z.string(),
  bindingId: z.string().brand<"WorkBindingId">(),
  compositionId: z.string().brand<"CompositionId">().optional(), // links to parent composition (required for AI agent execution)
  actorProjectionId: z.string().brand<"ActorId">(), // links to ActorProjection
  providerType: z.enum(["human", "ai-agent", "external-service", "organization", "machine"]).optional().default("human"), // E1 Audit: Track provider type
  workId: z.string().brand<"WorkId">(),
  workspaceId: z.string().optional(), // For realtime notifications (Fase 1 Dashboard)
  capabilityReference: z.string(), // links to core capability
  requirementId: z.string().brand<"RequirementId">(), // links to CapabilityRequirement
  role: z.string(),
  authority: z.enum(["view", "comment", "execute", "approve", "admin"]).default("execute"),
  status: z.enum(["pending", "accepted", "active", "completed", "rejected"]).default("pending"),
  boundAt: z.string(),
  acceptedAt: z.string().optional(),
  completedAt: z.string(),
  evidence: z.string().optional(),
});

export type WorkBinding = z.infer<typeof WorkBindingSchema>;
export type WorkBindingId = string & { __brand: "WorkBindingId" };
export function WorkBindingId(value: string): WorkBindingId { return value as WorkBindingId; }

// ------------------------------
// 4. TEAM PROJECTION - Canonical Layer 2 primitive: derived team from work bindings
// ONLY a projection, never a first-class aggregate - constitutional decision upheld
// ------------------------------
export const TeamProjectionSchema = z.object({
  id: z.string(),
  projectionId: z.string().brand<"TeamProjectionId">(),
  workId: z.string().brand<"WorkId">(),
  name: z.string(),
  bindings: z.array(z.string().brand<"WorkBindingId">()).default([]),
  actorProjections: z.array(z.string().brand<"ActorId">()).default([]),
  isEphemeral: z.boolean().default(true), // CONSTITUTIONAL: Team is always ephemeral projection
  projectedAt: z.string(),
  dissolvedAt: z.string().optional(),
  status: z.enum(["forming", "active", "completed", "dissolved"]).default("forming"),
});

export type TeamProjection = z.infer<typeof TeamProjectionSchema>;
export type TeamProjectionId = string & { __brand: "TeamProjectionId" };
export function TeamProjectionId(value: string): TeamProjectionId { return value as TeamProjectionId; }

// ------------------------------
// 5. COMPOSITION RESOLUTION - Canonical Layer 2 primitive: the actual atomic composition engine output
// This is the core of what atomic-composition adds to EOS Core
// ------------------------------
export const CompositionResolutionSchema = z.object({
  id: z.string(),
  compositionId: z.string().brand<"CompositionId">(),
  workId: z.string().brand<"WorkId">(),
  requirements: z.array(z.string().brand<"RequirementId">()).default([]), // CapabilityRequirements
  actorProjections: z.array(z.string().brand<"ActorId">()).default([]),
  bindings: z.array(z.string().brand<"WorkBindingId">()).default([]),
  teamProjectionId: z.string().brand<"TeamProjectionId">(),
  resolvedAt: z.string(),
  unresolvedRequirements: z.array(z.string().brand<"RequirementId">()).default([]),
  status: z.enum(["resolving", "resolved", "incomplete", "completed"]).default("resolving"),
});

export type CompositionResolution = z.infer<typeof CompositionResolutionSchema>;
export type CompositionId = string & { __brand: "CompositionId" };
export function CompositionId(value: string): CompositionId { return value as CompositionId; }

// ------------------------------
// ECONOMIC EVENT - Layer 3: Derived/Product Semantics (NOT EOS Core)
// Moved out of core - belongs to product layer, not composition substrate
// ------------------------------
// EconomicEvent is NOT part of Atomic Composition Core
// It belongs to Layer 3 - Derived Product Semantics (billing, payments, etc.)
// Only referenced here for composition output linking
export type EconomicEventId = string & { __brand: 'EconomicEventId' };
export function EconomicEventId(value: string): EconomicEventId { return value as EconomicEventId; }

// ============================================================================
// COMPOSITION ENGINE CONTRACTS
// ============================================================================
// Legacy types maintained for backwards compatibility with existing proof tests
// These are NOT new primitives - only compatibility shims
interface Assignment {
  id: string;
  actorId: string;
  actorProjectionId: string; // ActorProjection ID dari WorkBinding
  bindingId: string; // WorkBinding ID canonical dari atomic-composition
  requirementId: string;
  assignedAt: string;
}

export type TeamId = string & { __brand: 'TeamId' };
export function TeamId(value: string): TeamId { return value as TeamId; }

export interface Team {
  teamId: TeamId;
  workspaceId: string;
  name: string;
  members: string[]; // Array of actorIds assigned to this team
  lead?: string; // Lead actorId if assigned
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  assignmentId: AssignmentId;
  teamId: TeamId;
  requirementId: RequirementId;
  actorId: string;
  assignedAt: Date;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt?: Date;
  // Add missing properties referenced in composition.service.ts (align with existing usage)
  evidence?: string[];
  bindingId?: string;
  actorProjectionId?: string;
  capabilityReference?: string;
}

export interface AssignmentId extends Brand<string, "AssignmentId"> {}
export function AssignmentId(value: string): AssignmentId { return value as AssignmentId; }

export interface Requirement {
  requirementId: string;
  title: string;
  status: string;
}

interface LegacyRequirement {
  requirementId: string;
  capabilityId: string;
  minimumTrust: string;
  authority: string;
  resolved: boolean;
}

interface LegacyActor {
  actorId: string;
  type: "human" | "ai-agent" | "external-service" | "organization" | "machine"; // E1 Audit: All 5 provider types
  capabilities: string[];
  trust: string;
  availability: boolean;
}

export interface CapabilityResolutionRequest {
  workId: WorkId;
  work: any; // WorkAggregate from work-core
  requirements: LegacyRequirement[];
  availableActors: LegacyActor[];
  availableCapabilities: string[];
  workspaceId?: string; // Multi-tenant context untuk AI task isolation (Fase 1)
}

export interface CapabilityResolutionResult {
  success: boolean;
  assignments: Assignment[];
  team: Team;
  unresolvedRequirements: Requirement[];
  resolutionTimestamp: string;
  compositionId: string; // Canonical composition ID untuk E1 audit traceability
}

export interface CompositionLog {
  compositionId: string;
  workId: WorkId;
  teamId: TeamId;
  actorCount: number;
  assignmentCount: number;
  resolvedAt: string;
  algorithm: string;
}