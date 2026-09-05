"use client";

import React from "react";
// Remove direct capability import to fix rootDir violation - queries are resolved server-side
// import { sessionQueries } from "../../../../../../capabilities/identity/implementation/queries/session.queries";

interface SessionTabProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
    readonly id: string; // Current session ID
  };
  readonly isSaving: boolean;
  readonly setIsSaving: (value: boolean) => void;
  readonly setSaveSuccess: (message: string | null) => void;
}

interface SessionInfo {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  productId: string;
  workspaceId: string;
  isCurrent: boolean;
}

export function SessionTab({ session, isSaving, setIsSaving, setSaveSuccess }: SessionTabProps) {
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load active sessions on mount
  React.useEffect(() => {
    async function loadSessions() {
      try {
        const activeSessions = await sessionQueries.listActiveByUser(session.userId);
        const formattedSessions: SessionInfo[] = activeSessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          productId: s.productId,
          workspaceId: s.workspaceId,
          isCurrent: s.id === session.id,
        }));
        setSessions(formattedSessions);
      } catch (err) {
        console.error("[SessionTab] Failed to load sessions:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (session.userId) loadSessions();
  }, [session.userId, session.id]);

  // Revoke a session
  const handleRevokeSession = async (sessionId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/identity/session/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIdToRevoke: sessionId }),
      });

      if (response.ok) {
        // Remove revoked session from list
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setSaveSuccess("Session revoked successfully!");
      } else {
        throw new Error("Failed to revoke session");
      }
    } catch (err) {
      console.error("[SessionTab] Revoke error:", err);
      setSaveSuccess("Failed to revoke session. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-500">
        Loading sessions...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Manage your active sessions. You can revoke any session to sign out from that device.
      </p>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No active sessions found.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className={`rounded-lg border p-4 ${s.isCurrent ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">
                      {s.productId} / {s.workspaceId.slice(0, 8)}...
                    </p>
                    {s.isCurrent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Created: {new Date(s.createdAt).toLocaleString()} • 
                    Expires: {new Date(s.expiresAt).toLocaleString()}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    disabled={isSaving}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}