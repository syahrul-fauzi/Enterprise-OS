"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { MyRealityModel, CompanionInsight, ActivityEntry } from "@repo/presentation-entities";

export type MyRealityStatus = "idle" | "loading" | "success" | "error";

export interface UseMyRealityResult {
  data: MyRealityModel | null;
  status: MyRealityStatus;
  error: Error | null;
  refresh: () => Promise<void>;
  subscribe: (callback: (model: MyRealityModel) => void) => () => void;
}

export interface UseMyRealityOptions {
  actorId?: string;
  workspaceId?: string;
  autoRefreshIntervalMs?: number | null;
  suspense?: boolean;
  initialData?: MyRealityModel;
  fetcher?: (actorId?: string, workspaceId?: string) => Promise<MyRealityModel>;
}

const DEFAULT_ACTIVITY: ActivityEntry[] = [];
const EMPTY_MODEL: MyRealityModel = {
  actor: { id: "", displayName: "User" },
  summary: { totalWork: 0, inProgress: 0, bottlenecked: 0, completed: 0 },
  priority: { now: [], next: [], watching: [] },
  companion: { active: false, summary: "Companion belum terhubung", insights: [] as CompanionInsight[] },
  activity: DEFAULT_ACTIVITY,
  platformDistribution: [],
};

export function useMyReality(options: UseMyRealityOptions = {}): UseMyRealityResult {
  const {
    actorId,
    workspaceId,
    autoRefreshIntervalMs = null,
    initialData,
    fetcher,
  } = options;

  const [data, setData] = useState<MyRealityModel | null>(initialData ?? null);
  const [status, setStatus] = useState<MyRealityStatus>(initialData ? "success" : "idle");
  const [error, setError] = useState<Error | null>(null);
  const subscribersRef = useRef<Set<(model: MyRealityModel) => void>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const notifySubscribers = useCallback((model: MyRealityModel) => {
    subscribersRef.current.forEach((cb) => {
      try { cb(model); } catch { /* swallow subscriber errors */ }
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!fetcher) return;
    setStatus("loading");
    setError(null);
    try {
      const result = await fetcher(actorId, workspaceId);
      setData(result);
      setStatus("success");
      notifySubscribers(result);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to load MyReality data");
      setError(e);
      setStatus("error");
    }
  }, [fetcher, actorId, workspaceId, notifySubscribers]);

  const subscribe = useCallback((callback: (model: MyRealityModel) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    if (fetcher && status === "idle") {
      void refresh();
    }
  }, [fetcher, status, refresh]);

  useEffect(() => {
    if (autoRefreshIntervalMs && autoRefreshIntervalMs > 0 && fetcher) {
      intervalRef.current = setInterval(() => {
        void refresh();
      }, autoRefreshIntervalMs);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return undefined;
  }, [autoRefreshIntervalMs, fetcher, refresh]);

  return useMemo(
    () => ({
      data,
      status,
      error,
      refresh,
      subscribe,
    }),
    [data, status, error, refresh, subscribe]
  );
}

export function getEmptyMyRealityModel(): MyRealityModel {
  return { ...EMPTY_MODEL, priority: { now: [], next: [], watching: [] } };
}