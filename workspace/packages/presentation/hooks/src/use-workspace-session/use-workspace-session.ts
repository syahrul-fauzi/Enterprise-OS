"use client";

import { useEffect, useState } from "react";
import type { WorkspaceSession } from "@repo/core-kernel";

export interface UseWorkspaceSessionState {
  loading: boolean;
  authenticated: boolean;
  session: WorkspaceSession | null;
  error: string | null;
}

const INITIAL_STATE: UseWorkspaceSessionState = {
  loading: true,
  authenticated: false,
  session: null,
  error: null,
};

export function useWorkspaceSession() {
  const [state, setState] = useState<UseWorkspaceSessionState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const resp = await fetch("/api/session", { method: "GET" });
        if (!resp.ok) {
          if (!cancelled) {
            setState({ ...INITIAL_STATE, loading: false });
          }
          return;
        }
        const json = await resp.json();
        if (cancelled) return;
        const session = json.session ?? null;
        setState({
          loading: false,
          authenticated: Boolean(json.authenticated),
          session,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          ...INITIAL_STATE,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load session",
        });
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}