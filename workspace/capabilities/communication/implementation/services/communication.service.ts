import { recordRuntimeInvocation } from "@repo/core-runtime";
import { CommunicationRepositoryInMemory } from "../repository/communication.repository.js";
import type { CommunicationEvent, CommunicationEventId } from "../contracts/communication.contracts.js";

export class CommunicationService {
  async listEventsByWork(workId: string): Promise<readonly CommunicationEvent[]> {
    const events = await CommunicationRepositoryInMemory.byWorkId(workId);
    recordRuntimeInvocation({
      capabilityId: "communication",
      operationId: "list-events-by-work",
      sourceRef: "CommunicationService.listEventsByWork",
      success: true,
      input: { workId },
      result: { count: events.length, event_ids: events.map(e => e.event_id) }
    });
    return events;
  }

  async getEventById(id: CommunicationEventId): Promise<CommunicationEvent | undefined> {
    const event = await CommunicationRepositoryInMemory.byId(id);
    recordRuntimeInvocation({
      capabilityId: "communication",
      operationId: "get-event-by-id",
      sourceRef: "CommunicationService.getEventById",
      success: !!event,
      input: { id },
      result: event ? { found: true } : { found: false, error: "event_not_found" }
    });
    return event;
  }

  async listAllEvents(): Promise<readonly CommunicationEvent[]> {
    const events = await CommunicationRepositoryInMemory.list();
    recordRuntimeInvocation({
      capabilityId: "communication",
      operationId: "list-all-events",
      sourceRef: "CommunicationService.listAllEvents",
      success: true,
      input: {},
      result: { total_events: events.length }
    });
    return events;
  }
}

export const communicationService = new CommunicationService();