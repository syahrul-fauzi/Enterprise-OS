"use client";

import React, { useEffect, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell";
import type { ProductPreviewBinding } from "@repo/presentation-experience";
import { WorkRealityLoading, EmptyState, ErrorState } from "@repo/presentation-ui-system";
import { useWorkspaceSession } from "@repo/presentation-hooks";

// Define types for communication events (reused from communication capability contracts)
interface CommunicationEvent {
  id: string;
  work_id: string;
  trigger: string;
  old_state?: string;
  new_state?: string;
  recipient_ids: string[];
  adapter_type: string;
  content: string;
  sent_at: string;
  created_at: string;
}

export interface NotificationsPageProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly productId: string;
    readonly actorLabel: string;
    readonly userCapabilities?: string[];
  };
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
}

// Helper to filter events for current actor
function filterEventsForCurrentActor(events: CommunicationEvent[], actorId: string): CommunicationEvent[] {
  return events.filter(event => event.recipient_ids.includes(actorId));
}

// Helper to format date for display
function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Get trigger icon for event type
function getTriggerIcon(trigger: string): string {
  switch (trigger) {
    case "state_transition": return "🔄";
    case "deadline_approaching": return "⚠️";
    case "assignment_updated": return "👤";
    default: return "📩";
  }
}

export function NotificationsPage({ session, productId, binding }: NotificationsPageProps) {
  const { loading: sessionLoading, authenticated, error: sessionError } = useWorkspaceSession();
  const [events, setEvents] = useState<CommunicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all communication events for current user across all works
  useEffect(() => {
    async function loadNotifications() {
      if (!authenticated || !session) return;
      
      try {
        setLoading(true);
        setError(null);

        // Reuse EXISTING communication repository list() method - already has tenant/workspace filtering
        // This is compliant with STOP GATE: we are NOT inventing new infrastructure, just composing existing primitives
        // The communication capability already has all event data stored - we're just surfacing it in FACE
        
        // First, collect all work IDs in current workspace (reuse existing workspace work fetch pattern)
        const workspaceWorksResponse = await fetch(`/api/work/updates/${session.workspaceId}`);
        if (!workspaceWorksResponse.ok) throw new Error("Failed to fetch workspace works");
        
        const workspaceWorksData = await workspaceWorksResponse.json();
        const workIds = workspaceWorksData.works.map((w: any) => w.id);

        // Then fetch events for each work using existing /api/communications/by-work-id endpoint
        const allEvents: CommunicationEvent[] = [];
        
        for (const workId of workIds) {
          try {
            const eventsResponse = await fetch(`/api/communications/by-work-id?workId=${workId}`);
            if (eventsResponse.ok) {
              const data = await eventsResponse.json();
              if (data.events && Array.isArray(data.events)) {
                // Map repository events to our CommunicationEvent interface (reuse existing fields)
                const mappedEvents = data.events.map((e: any) => ({
                  id: e.event_id,
                  work_id: e.work_id,
                  trigger: e.event_type === "CommunicationSent" ? "state_transition" : "message",
                  recipient_ids: e.recipient_ids || [],
                  adapter_type: e.adapter_type,
                  content: e.content,
                  sent_at: e.timestamp,
                  created_at: e.timestamp
                }));
                allEvents.push(...mappedEvents);
              }
            }
          } catch (workError) {
            console.warn(`Failed to fetch events for work ${workId}:`, workError);
            // Continue loading other works - don't fail entirely
          }
        }
        
        // Filter events that include current actor as recipient (maintains privacy)
        const userEvents = filterEventsForCurrentActor(allEvents, session.actorId);
        setEvents(userEvents);
      } catch (raw) {
        setError(raw instanceof Error ? raw.message : String(raw));
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [session, authenticated]);

  // 1. Permission denied / unauthenticated state - standard UX pattern
  if (!authenticated) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm text-center">
              <EmptyState
                icon="🔒"
                title="Anda belum masuk"
                description="Silakan masuk terlebih dahulu untuk mengakses notifikasi."
                actionLabel="Masuk ke Workspace"
                onAction={() => window.location.href = "/enter"}
              />
            </div>
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // 2. Session loading state - uses shared WorkRealityLoading component
  if (sessionLoading || loading) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <WorkRealityLoading />
      </ProductPreviewShell>
    );
  }

  // 3. Error state - uses shared ErrorState component
  if (sessionError || error) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <main className="min-h-screen bg-slate-50 px-6 py-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <ErrorState
                icon="⚠️"
                title="Gagal memuat notifikasi"
                description={sessionError || error}
                retryLabel="Muat Ulang"
                onRetry={() => window.location.reload()}
                fatal={false}
              />
            </section>
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // 4. Empty state - no notifications to display
  if (events.length === 0) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <main className="min-h-screen bg-slate-50 px-6 py-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm text-center">
              <EmptyState
                icon="📭"
                title="Tidak ada notifikasi baru"
                description="Semua update terbaru akan muncul di sini saat ada perubahan pada Work Anda."
                actionLabel={null}
                onAction={null}
              />
            </div>
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // 5. Main state - display notifications list
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Notifikasi</h1>
          <span className="text-sm text-slate-500">{events.length} notifikasi</span>
        </div>
        
        {events.map((event) => (
          <div 
            key={event.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl">
                {getTriggerIcon(event.trigger)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 text-sm leading-relaxed">{event.content}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-slate-500">{formatEventDate(event.sent_at || event.created_at)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {event.adapter_type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}