import { z } from "zod";
import type { WorkActor } from "@capabilities/work-inspection";
import type { UserId, UserAggregate } from "@repo/capabilities-identity";

// E1-P2-N1: Break circular dependency between atomic-composition and work-core
// Define ID types locally instead of importing
export type WorkId = string & z.BRAND<"WorkId">;
export type ActorId = string & z.BRAND<"ActorId">;

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
export type RequirementId = z.infer<typeof CapabilityRequirementSchema.shape.requirementId>;
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


// ------------------------------
// 3. WORK BINDING - Extended to ValueReality Hyper-Relationship Participant
// BETTER-EOS: Suports ALL participant types in the same compositionId (Actor, Capability, Resource, Work, Product)
// Layer 2 extension only - NO core kernel changes
// ------------------------------
export const ParticipantTypeSchema = z.enum([
  "actor",           // Human/AI/Machine Actor
  "capability",      // Core Capability
  "resource",        // Physical/Digital Resource
  "work",            // Work Aggregate
  "product"          // Product Experience/Identity
]);
export type ParticipantType = z.infer<typeof ParticipantTypeSchema>;

export const WorkBindingSchema = z.object({
  id: z.string(),
  bindingId: z.string().brand<"WorkBindingId">(),
  compositionId: z.string().brand<"CompositionId">(), // REQUIRED for hyper-relationships: ALL participants share the same compositionId
  participantId: z.string(), // Unified participant ID (works for ALL types)
  participantType: ParticipantTypeSchema, // What kind of participant is this?
  providerType: z.enum(["human", "ai-agent", "external-service", "organization", "machine", "resource", "capability", "work", "product", "system"]).optional().default("human"),
  // Legacy fields for backward compatibility
  actorProjectionId: z.string().brand<"ActorId">().optional(),
  workId: z.string().brand<"WorkId">().optional(),
  capabilityReference: z.string().optional(),
  requirementId: z.string().brand<"RequirementId">().optional(),
  // Hyper-relationship metadata
  relationshipPurpose: z.string().optional(), // The "why" of this value relationship
  role: z.string(),
  authority: z.enum(["view", "comment", "execute", "approve", "admin"]).default("execute"),
  status: z.enum(["pending", "accepted", "active", "completed", "rejected"]).default("pending"),
  boundAt: z.string(),
  updatedAt: z.string().optional(), // For relationship lifecycle changes
  workspaceId: z.string().optional(), // Added to support workspace-specific bindings
  updatedBy: z.string().optional(),
});

// ------------------------------
// 4. COMMAND SCHEMAS - untuk composeTeamFromRequirements command
// ------------------------------
export const CapabilityResolutionRequestSchema = z.object({
  workId: z.string().optional(),
  work: z.any(), // WorkAggregate dari work-core
  requirements: z.array(z.string()).default([]),
  availableActors: z.array(z.any()).default([]),
  availableCapabilities: z.array(z.string()).default([]),
  workspaceId: z.string().optional(),
});

export type CapabilityResolutionRequest = z.infer<typeof CapabilityResolutionRequestSchema>;

export const AssignmentSchema = z.object({
  assignmentId: z.string(),
  teamId: z.string(),
  requirementId: z.string().optional(),
  actorId: z.string(),
  assignedAt: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "pending", "accepted", "active", "completed", "rejected"]).optional(),
  completedAt: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  bindingId: z.string().optional(),
  actorProjectionId: z.string().optional(),
  capabilityReference: z.string().optional(),
  // Pertahankan property yang sudah ada di interface Assignment
  // Serta tambahkan role yang dibutuhkan composeTeamFromRequirements
  role: z.string().optional(),
  capabilityId: z.string().optional(),
});

export const CapabilityResolutionResultSchema = z.object({
  teamId: z.string(),
  compositionId: z.string(),
  assignments: z.array(AssignmentSchema).default([]),
  success: z.boolean().default(true),
  team: z.any().optional(), // Add optional team property for backward compatibility
  unresolvedRequirements: z.array(z.any()).optional(),
  resolutionTimestamp: z.union([z.date(), z.string()]).optional(),
});

export type CapabilityResolutionResult = z.infer<typeof CapabilityResolutionResultSchema>;

export const CreateTeamRequestSchema = z.object({
  workId: z.string(),
  actorIds: z.array(z.string()),
  actorId: z.string().optional(),
});

export type CreateTeamRequest = z.infer<typeof CreateTeamRequestSchema>;

export const CreateTeamResultSchema = z.object({
  teamId: z.string(),
  saved: z.boolean().default(true),
});

export type CreateTeamResult = z.infer<typeof CreateTeamResultSchema>;

// Fixed WorkBindingSchema definition - no duplicate export
// The schema was already defined earlier, this block was orphaned and removed
// Original error caused by missing opening brace that created orphaned property declarations

export type WorkBinding = z.infer<typeof WorkBindingSchema>;
// Reuse canonical patterns - WorkBindingId is composition-specific but follows work-core branding
export type WorkBindingId = z.infer<typeof WorkBindingSchema.shape.bindingId>;
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
export type CompositionId = z.infer<typeof WorkBindingSchema.shape.compositionId>;
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
export type TeamId = string & { __brand: 'TeamId' };
export function TeamId(value: string): TeamId { return value as TeamId; }

export interface Team {
  teamId: TeamId;
  workspaceId: string;
  name: string;
  members: string[]; // Array of actorIds assigned to this team
  lead?: string; // Lead actorId if assigned
  workId?: WorkId; // Add support for work-scoped team assignments
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  assignmentId: AssignmentId;
  teamId: TeamId;
  requirementId: RequirementId;
  actorId: string;
  assignedAt: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt?: string;
  // Add missing properties referenced in composition.service.ts (align with existing usage)
  evidence?: string[];
  bindingId?: string;
  actorProjectionId?: string;
  capabilityReference?: string;
  role?: string;
  capabilityId?: string;
  // Minimal backward compatibility properties for composition.repository.ts
  id?: string;           // Required by legacy WorkBinding→Assignment conversion
  authority?: string;    // Required by existing binding authority model
  participantId?: string;// Legacy property from WorkBinding for backward compatibility
}

export type AssignmentId = string & { __brand: "AssignmentId" };
export function AssignmentId(value: string): AssignmentId { return value as AssignmentId; }

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

// BACKWARD COMPATIBILITY: Extend the zod-derived type for legacy usage
export interface LegacyCapabilityResolutionRequest {
  workId: WorkId;
  work: any; // WorkAggregate from work-core
  requirements: LegacyRequirement[];
  availableActors: LegacyActor[];
  availableCapabilities: string[];
  workspaceId?: string; // Multi-tenant context untuk AI task isolation (Fase 1)
}

export interface LegacyCapabilityResolutionResult {
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