import { z } from "zod";

// Branded types for type safety
export type CommunicationEventId = string & { __brand: "CommunicationEventId" };
export type WorkId = string & { __brand: "WorkId" };
export type ActorId = string & { __brand: "ActorId" };
export type TenantId = string & { __brand: "TenantId" };
export type SessionId = string & { __brand: "SessionId" };

// Supported communication adapter types - follows connector ecosystem pattern
export const CommunicationAdapterTypes = [
  "whatsapp",
  "email",
  "in_app_chat",
  "api_webhook",
  "sms",
  "slack",
  "teams"
] as const;

export type CommunicationAdapterType = typeof CommunicationAdapterTypes[number];

// Communication event status
export const CommunicationEventStatus = [
  "draft",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed"
] as const;

export type CommunicationEventStatus = typeof CommunicationEventStatus[number];

// Base Communication Event schema - follows identity contract event pattern
export const BaseCommunicationEventSchema = z.object({
  event_id: z.string().uuid().describe("Unique event identifier"),
  event_type: z.literal("CommunicationSent").describe("Type of communication event"),
  work_id: z.string().describe("Work ID this communication is grounded to - critical for shared reference"),
  actor_id: z.string().describe("Actor who sent the message"),
  recipient_ids: z.array(z.string()).describe("All recipients of this message"),
  adapter_type: z.enum(CommunicationAdapterTypes).describe("Communication channel used"),
  content: z.string().describe("Message content"),
  timestamp: z.string().datetime().describe("ISO timestamp of message creation"),
  status: z.enum(CommunicationEventStatus).default("draft").describe("Delivery status"),
  // Ambient context propagation - follows consultation.commands.ts pattern
  decision_id: z.string().optional().describe("Linked decision ID for lineage preservation"),
  last_invocation_digest: z.string().optional().describe("Previous invocation digest for W4-C20-001 compliance"),
  // Work context metadata
  tenant_id: z.string().describe("Tenant ID for isolation"),
  session_id: z.string().describe("Session ID for tracing"),
  workspace_id: z.string().describe("Workspace ID for organization"),
  // External message tracking ID (for webhook reconciliation)
  message_id: z.string().optional().describe("External platform message ID for webhook tracking")
});

export type CommunicationEvent = z.infer<typeof BaseCommunicationEventSchema>;

// Input schema for sending communication
export const SendCommunicationInputSchema = BaseCommunicationEventSchema.omit({
  event_id: true,
  timestamp: true,
  status: true
});

export type SendCommunicationInput = z.infer<typeof SendCommunicationInputSchema>;

// Output schema
export interface SendCommunicationOutput {
  id: CommunicationEventId;
  status: CommunicationEventStatus;
  sent_at: string;
  adapter_receipt: Record<string, unknown>;
}

// Communication repository interface - standardized across all storage backends
export interface CommunicationRepository {
  readonly entityName: "CommunicationEvent";
  readonly kind: "repository";
  byId(id: CommunicationEventId, context?: { tenantId: string; workspaceId: string }): Promise<CommunicationEvent | undefined>;
  byWorkId(workId: string, context?: { tenantId: string; workspaceId: string }): Promise<readonly CommunicationEvent[]>;
  byTenantId(tenantId: string): Promise<readonly CommunicationEvent[]>;
  list(context?: { tenantId: string; workspaceId: string }): Promise<readonly CommunicationEvent[]>;
  save(entity: CommunicationEvent, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<void>;
  updateStatus(id: CommunicationEventId, status: CommunicationEventStatus, context?: { tenantId: string; workspaceId: string }): Promise<boolean>;
  remove(id: CommunicationEventId, context?: { tenantId: string; workspaceId: string }): Promise<boolean>;
  clear(): Promise<void> | void;
}

// Adapter interface - all communication adapters implement this
export interface CommunicationAdapter {
  id: string;
  adapter_type: CommunicationAdapterType;
  send: (event: CommunicationEvent) => Promise<{ success: boolean; record?: unknown; error?: string }>;
  validate: (input: SendCommunicationInput) => { valid: boolean; errors?: string[] };
}

// Generate new communication event ID - follows same pattern as all other capabilities
export function newCommunicationEventId(): CommunicationEventId {
  return `comm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}` as CommunicationEventId;
}

export const defaultCommunicationStatus: CommunicationEventStatus = "draft";