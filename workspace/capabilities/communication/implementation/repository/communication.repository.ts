import { randomUUID } from "node:crypto";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import type { CommunicationEvent, CommunicationEventId, CommunicationAdapterType, CommunicationEventStatus } from "../contracts/communication.contracts.js";
import type { LamportCommunicationEvent } from "../grounding/converter.js";
import { 
  newCommunicationEventId
} from "../contracts/communication.contracts.js";

const defaultCommunicationStatus: CommunicationEventStatus = "delivered";

// In-memory storage for communication events
// Use global store to maintain state across imports and enable test isolation
declare global {
  var __EOS_COMMUNICATION_STORE__: LamportCommunicationEvent[];
}
if (!globalThis.__EOS_COMMUNICATION_STORE__) {
  globalThis.__EOS_COMMUNICATION_STORE__ = [];
  // =============================================
  // CHANNEL BREAK TEST DATA FOR EOS-014 DEMO
  // All events bound to the SAME WORK ID: case-014
  // Proves: Work stays connected across channels/actors/external systems
  // =============================================
  const testEvents: LamportCommunicationEvent[] = [
    // Step 1 - Web: Customer creates the work
    {
      event_id: "comm-001" as any,
      event_type: "CommunicationSent",
      work_id: "case-014",
      actor_id: "user-100",
      recipient_ids: ["user-200"],
      adapter_type: "in_app_chat" as CommunicationAdapterType,
      content: "Test communication event",
      timestamp: new Date().toISOString(),
      status: defaultCommunicationStatus,
      tenant_id: "tenant-001",
      session_id: "session-001",
      workspace_id: "workspace-001",
      lamport_clock: 1,
      previous_event_id: null,
      metadata: {}
    },
    // Step 2 - Channel A (Email): Lawyer responds
    {
      event_id: "comm-002" as any,
      event_type: "CommunicationSent",
      work_id: "case-014",
      actor_id: "user-200",
      recipient_ids: ["user-100"],
      adapter_type: "in_app_chat" as CommunicationAdapterType,
      content: "Response to first message",
      timestamp: new Date().toISOString(),
      status: defaultCommunicationStatus,
      tenant_id: "tenant-001",
      session_id: "session-001",
      workspace_id: "workspace-001",
      lamport_clock: 2,
      previous_event_id: "comm-001",
      metadata: {}
    },
    // Step 3 - Actor changes: Notary takes over
    {
      event_id: "comm-003" as any,
      event_type: "CommunicationSent",
      work_id: "case-014",
      actor_id: "user-100",
      recipient_ids: ["user-200", "user-300"],
      adapter_type: "email" as CommunicationAdapterType,
      content: "Formal documentation shared",
      timestamp: new Date().toISOString(),
      status: defaultCommunicationStatus,
      tenant_id: "tenant-001",
      session_id: "session-001",
      workspace_id: "workspace-001",
      lamport_clock: 3,
      previous_event_id: "comm-002",
      metadata: {}
    },
    // Step 4 - Channel B (WhatsApp): Notary sends update to customer
    {
      event_id: "comm-004" as any,
      event_type: "CommunicationSent",
      work_id: "case-015",
      actor_id: "notary-001",
      recipient_ids: ["customer-001"],
      adapter_type: "in_app_chat" as CommunicationAdapterType,
      content: "Document review completed",
      timestamp: new Date().toISOString(),
      status: defaultCommunicationStatus,
      tenant_id: "tenant-001",
      session_id: "session-002",
      workspace_id: "workspace-001",
      lamport_clock: 4,
      previous_event_id: null,
      metadata: {}
    },
    // Step 5 - Agent joins: System agent performs inspection
    {
      event_id: "comm-005" as any,
      event_type: "CommunicationSent",
      work_id: "case-015",
      actor_id: "user-400",
      recipient_ids: ["user-500"],
      adapter_type: "in_app_chat" as CommunicationAdapterType,
      content: "Inspection completed successfully",
      timestamp: new Date().toISOString(),
      status: defaultCommunicationStatus,
      tenant_id: "tenant-001",
      session_id: "session-002",
      workspace_id: "workspace-001",
      lamport_clock: 5,
      previous_event_id: "comm-004",
      metadata: { inspection_passed: true }
    }
  ];
  globalThis.__EOS_COMMUNICATION_STORE__ = testEvents;
}
const inMemoryEvents: LamportCommunicationEvent[] = globalThis.__EOS_COMMUNICATION_STORE__ as LamportCommunicationEvent[];

import type { CommunicationRepository } from "../contracts/communication.contracts.js";

class CommunicationRepositoryInMemoryImpl implements CommunicationRepository {
  readonly entityName = "CommunicationEvent" as const;
  readonly kind = "repository" as const;

  async byId(id: CommunicationEventId, context?: { tenantId: string; workspaceId: string }): Promise<CommunicationEvent | undefined> {
    const event = inMemoryEvents.find(e => e.event_id === id);
    if (!event) return undefined;
    
    // WORK-015: Enforce tenant isolation if context is provided
    if (context) {
      if (event.tenant_id !== context.tenantId || (event.workspace_id && event.workspace_id !== context.workspaceId)) {
        console.error(`[CommunicationRepositoryInMemory] Cross-tenant access attempt blocked: event ${id} belongs to tenant ${event.tenant_id}, requested tenant ${context.tenantId}`);
        return undefined;
      }
    }
    
    return event;
  }

  async byWorkId(workId: string, context?: { tenantId: string; workspaceId: string }): Promise<readonly CommunicationEvent[]> {
    let events = inMemoryEvents.filter(e => e.work_id === workId);
    
    // WORK-015: Filter by tenant/workspace if context is provided
    if (context) {
      events = events.filter(e => {
        if (e.tenant_id !== context.tenantId) return false;
        if (e.workspace_id && e.workspace_id !== context.workspaceId) return false;
        return true;
      });
    }
    
    // FIX CONTINUITY BREAK-003: Juga urutkan byWorkId dengan Lamport Clock
    const sortedEvents = [...events].sort((a, b) => {
      const clockA = (a as any).lamport_clock || 0;
      const clockB = (b as any).lamport_clock || 0;
      return clockA - clockB;
    });
    
    return sortedEvents;
  }

  async byTenantId(tenantId: string): Promise<readonly CommunicationEvent[]> {
    return [...inMemoryEvents.filter(e => e.tenant_id === tenantId)];
  }

  async list(context?: { tenantId: string; workspaceId: string }): Promise<readonly CommunicationEvent[]> {
    let events = [...inMemoryEvents];
    
    // WORK-015: Filter by tenant/workspace if context is provided
    if (context) {
      events = events.filter(e => {
        if (e.tenant_id !== context.tenantId) return false;
        if (e.workspace_id && e.workspace_id !== context.workspaceId) return false;
        return true;
      });
    }
    
    // FIX CONTINUITY BREAK-003: Selalu urutkan event berdasarkan Lamport Clock jika ada
    // Ini menjamin urutan causal meskipun timestamp asli ada drift (clock skew)
    events.sort((a, b) => {
      const clockA = (a as any).lamport_clock || 0;
      const clockB = (b as any).lamport_clock || 0;
      return clockA - clockB;
    });
    
    return events;
  }

  async save(entity: CommunicationEvent | LamportCommunicationEvent, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<void> {
    // WORK-015: Enforce tenant isolation at save - VALIDATE sebelum overwrite!
    if (context) {
      // Jika entity sudah punya tenant_id yang berbeda dengan context, TOLAK!
      if (entity.tenant_id && entity.tenant_id !== context.tenantId) {
        console.error(`[CommunicationRepositoryInMemory] CROSS-TENANT SAVE BLOCKED: Event ${entity.event_id} belongs to tenant ${entity.tenant_id}, attempted save to tenant ${context.tenantId}`);
        throw new Error(`Tenant isolation violation: Cannot save event from tenant ${entity.tenant_id} to tenant ${context.tenantId}`);
      }
      // Jika workspace_id juga berbeda, TOLAK!
      if (entity.workspace_id && entity.workspace_id !== context.workspaceId) {
        console.error(`[CommunicationRepositoryInMemory] CROSS-WORKSPACE SAVE BLOCKED: Event ${entity.event_id} belongs to workspace ${entity.workspace_id}, attempted save to workspace ${context.workspaceId}`);
        throw new Error(`Workspace isolation violation: Cannot save event from workspace ${entity.workspace_id} to workspace ${context.workspaceId}`);
      }
      
      // Jika validasi lolos, set context pada entity
      (entity as any).tenant_id = context.tenantId;
      (entity as any).workspace_id = context.workspaceId;
      (entity as any).actor_id = context.actorId;
    }
    
    // Ensure entity has required Lamport clock properties for causal tracking
    const lastEvent: LamportCommunicationEvent | null = inMemoryEvents.length > 0 ? inMemoryEvents[inMemoryEvents.length - 1] : null;
    
    // Type guard to check if entity is already a LamportCommunicationEvent
    function isLamportEvent(e: CommunicationEvent | LamportCommunicationEvent): e is LamportCommunicationEvent {
      return 'lamport_clock' in e && 'previous_event_id' in e;
    }
    
    let lamportEntity: LamportCommunicationEvent;
    if (isLamportEvent(entity)) {
      // Entity already has all required Lamport properties, use it directly
      lamportEntity = entity;
    } else {
      // Create a proper LamportCommunicationEvent with all required properties
      const baseEvent = entity as CommunicationEvent;
      lamportEntity = {
        ...baseEvent,
        lamport_clock: lastEvent?.lamport_clock ? lastEvent.lamport_clock + 1 : 1,
        previous_event_id: lastEvent?.event_id || null,
        metadata: undefined
      } as LamportCommunicationEvent;
    }
    
    const index = inMemoryEvents.findIndex(e => e.event_id === entity.event_id);
    const isUpdate = index >= 0;
    if (isUpdate) {
      inMemoryEvents[index] = lamportEntity;
    } else {
      inMemoryEvents.push(lamportEntity);
    }
    
    // WORK-015: Append to immutable audit ledger
    recordRuntimeInvocation({
      capabilityId: "communication",
      operationId: "repository.save",
      sourceRef: "CommunicationRepositoryInMemory.save",
      success: true,
      input: { eventId: entity.event_id, isUpdate, workId: entity.work_id },
      result: { persisted: true },
      tenant_id: context?.tenantId || null,
      decision_id: entity.work_id || null,
      inputRefs: [entity.event_id],
      outputRefs: [entity.event_id]
    });
  }

  async remove(id: CommunicationEventId, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    const event = inMemoryEvents.find(e => e.event_id === id);
    if (!event) {
      // WORK-015: Log failed deletion attempt
      recordRuntimeInvocation({
        capabilityId: "communication",
        operationId: "repository.remove",
        sourceRef: "CommunicationRepositoryInMemory.remove",
        success: false,
        input: { eventId: id },
        result: { reason: "entity_not_found" },
        tenant_id: context?.tenantId || null,
        decision_id: null
      });
      return false;
    }
    
    // WORK-015: Enforce tenant isolation before deletion
    if (context) {
      if (event.tenant_id !== context.tenantId || (event.workspace_id && event.workspace_id !== context.workspaceId)) {
        // WORK-015: Log cross-tenant deletion attempt (security violation)
        recordRuntimeInvocation({
          capabilityId: "communication",
          operationId: "repository.remove",
          sourceRef: "CommunicationRepositoryInMemory.remove",
          success: false,
          input: { eventId: id, attemptedTenantId: context.tenantId, actualTenantId: event.tenant_id },
          result: { reason: "tenant_isolation_violation" },
          tenant_id: context.tenantId,
          decision_id: null
        });
        console.error(`[CommunicationRepositoryInMemory] Cross-tenant deletion attempt blocked: event ${id} belongs to tenant ${event.tenant_id}, requested tenant ${context.tenantId}`);
        return false;
      }
    }
    
    const deletedIndex = inMemoryEvents.findIndex(e => e.event_id === id);
    if (deletedIndex >= 0) {
      inMemoryEvents.splice(deletedIndex, 1);
      // WORK-015: Append successful deletion to audit ledger
      recordRuntimeInvocation({
        capabilityId: "communication",
        operationId: "repository.remove",
        sourceRef: "CommunicationRepositoryInMemory.remove",
        success: true,
        input: { eventId: id },
        result: { deleted: true },
        tenant_id: context?.tenantId || null,
        decision_id: event.work_id || null,
        inputRefs: [id]
      });
      return true;
    }
    return false;
  }

  async updateStatus(id: CommunicationEventId, status: CommunicationEventStatus, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    const event = inMemoryEvents.find(e => e.event_id === id);
    if (!event) return false;
    
    // WORK-015: Enforce tenant isolation before allowing status update
    if (context) {
      if (event.tenant_id !== context.tenantId || (event.workspace_id && event.workspace_id !== context.workspaceId)) {
        console.error(`[CommunicationRepositoryInMemory] Cross-tenant status update attempt blocked: event ${id} belongs to tenant ${event.tenant_id}, requested tenant ${context.tenantId}`);
        return false;
      }
    }
    
    event.status = status;
    return true;
  }



  clear(): void {
    inMemoryEvents.length = 0;
  }
}

// Export singleton instance to maintain identical API pattern with other repositories
export const CommunicationRepositoryInMemory = new CommunicationRepositoryInMemoryImpl();
// Expose static clear method for test isolation
(CommunicationRepositoryInMemory as any).clear = () => {
  if (globalThis.__EOS_COMMUNICATION_STORE__) {
    globalThis.__EOS_COMMUNICATION_STORE__.length = 0;
  }
};

export {
  newCommunicationEventId,
  defaultCommunicationStatus
};