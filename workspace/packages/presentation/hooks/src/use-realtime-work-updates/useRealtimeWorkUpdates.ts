"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MyRealityModel, RealityWorkItem, ActivityEntry } from "@repo/presentation-entities";

export type WorkUpdateType =
  | "work.created"
  | "work.state_changed"
  | "work.priority_changed"
  | "work.bottleneck_detected"
  | "work.bottleneck_resolved"
  | "work.next_action_available"
  | "companion.insight"
  | "activity.new"
  | "model.updated";

export interface WorkUpdateEvent {
  type: WorkUpdateType;
  timestamp: number;
  actorId?: string;
  workId?: string;
  payload?: Record<string, unknown>;
}

export interface UseRealtimeWorkUpdatesOptions {
  actorId?: string;
  workspaceId?: string;
  enabled?: boolean;
  pollIntervalMs?: number;
  eventSourceUrl?: string;
  onEvent?: (event: WorkUpdateEvent) => void;
  onModelPatch?: (patch: Partial<MyRealityModel>) => void;
}

export interface UseRealtimeWorkUpdatesResult {
  isConnected: boolean;
  isListening: boolean;
  lastEvent: WorkUpdateEvent | null;
  lastUpdatedAt: number | null;
  reconnect: () => void;
  pendingEvents: WorkUpdateEvent[];
  dismissEvent: (eventType?: WorkUpdateType) => void;
}

export function useRealtimeWorkUpdates(
  options: UseRealtimeWorkUpdatesOptions = {}
): UseRealtimeWorkUpdatesResult {
  const {
    actorId,
    workspaceId,
    enabled = true,
    pollIntervalMs = null,
    eventSourceUrl,
    onEvent,
    onModelPatch,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<WorkUpdateEvent | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [pendingEvents, setPendingEvents] = useState<WorkUpdateEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEvent = useCallback(
    (event: WorkUpdateEvent) => {
      setLastEvent(event);
      setLastUpdatedAt(event.timestamp);
      setPendingEvents((prev) => [...prev.slice(-49), event]);
      onEvent?.(event);
    },
    [onEvent]
  );

  const dismissEvent = useCallback((eventType?: WorkUpdateType) => {
    setPendingEvents((prev) =>
      eventType ? prev.filter((e) => e.type !== eventType) : prev.slice(0, 0)
    );
  }, []);

  const startPolling = useCallback(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return;
    pollIntervalRef.current = setInterval(() => {
      const tickEvent: WorkUpdateEvent = {
        type: "model.updated",
        timestamp: Date.now(),
        actorId,
        payload: { source: "polling", workspaceId },
      };
      handleEvent(tickEvent);
    }, pollIntervalMs);
  }, [pollIntervalMs, actorId, workspaceId, handleEvent]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startEventSource = useCallback(() => {
    if (typeof window === "undefined" || !eventSourceUrl) return;
    try {
      const params = new URLSearchParams();
      if (actorId) params.set("actorId", actorId);
      // workspaceId is already included in eventSourceUrl path for new /api/work/updates/[workspaceId] routes
      const url = `${eventSourceUrl}${params.toString() ? `?${params.toString()}` : ""}`;
      const es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        setIsConnected(true);
        setIsListening(true);
      };

      es.onerror = () => {
        setIsConnected(false);
      };

      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as WorkUpdateEvent;
          handleEvent(parsed);
        } catch {
          // Ignore parse errors for single messages
        }
      };

      eventSourceRef.current = es;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [eventSourceUrl, actorId, workspaceId, handleEvent]);

  const stopEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
  }, []);

  const reconnect = useCallback(() => {
    stopEventSource();
    stopPolling();
    if (eventSourceUrl) {
      startEventSource();
    } else if (pollIntervalMs) {
      startPolling();
      setIsConnected(true);
      setIsListening(true);
    }
  }, [stopEventSource, stopPolling, startEventSource, startPolling, eventSourceUrl, pollIntervalMs]);

  useEffect(() => {
    if (!enabled) return undefined;

    if (eventSourceUrl && typeof window !== "undefined") {
      startEventSource();
    } else if (pollIntervalMs) {
      startPolling();
      setIsConnected(true);
      setIsListening(true);
    }

    return () => {
      stopEventSource();
      stopPolling();
    };
  }, [enabled, eventSourceUrl, pollIntervalMs, startEventSource, startPolling, stopEventSource, stopPolling]);

  return {
    isConnected,
    isListening,
    lastEvent,
    lastUpdatedAt,
    reconnect,
    pendingEvents,
    dismissEvent,
  };
}

export { type MyRealityModel, type RealityWorkItem, type ActivityEntry };