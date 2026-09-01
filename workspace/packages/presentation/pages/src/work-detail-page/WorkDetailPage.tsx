"use client";

import React, { useState, useEffect } from 'react';
import { WorkRealityTemplate } from "@repo/presentation-templates";
import { WorkRealityLoading, Card, Button } from "@repo/presentation-ui-system";
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";
import type { AnyWorkAggregate, GenericCommunicationEvent } from "@repo/presentation-features";

interface WorkDetailPageCallbackProps {
  workId: string;
  fetchWork: (id: string) => Promise<AnyWorkAggregate>;
  fetchCommunications: (workId: string) => Promise<GenericCommunicationEvent[]>;
  defaultPerspective?: WorkRealityPerspective;
  onAssignLawyer?: (formData: FormData) => Promise<void>;
  onAddEvidence?: (formData: FormData) => Promise<void>;
  onMarkCompleted?: (formData: FormData) => Promise<void>;
  initialWork?: undefined;
  initialCommunications?: undefined;
}

interface WorkDetailPagePrefetchProps {
  workId: string;
  initialModel: WorkRealityModel;
  initialWork?: undefined;
  initialCommunications?: undefined;
  defaultPerspective?: WorkRealityPerspective;
  onAssignLawyer?: (formData: FormData) => Promise<void>;
  onAddEvidence?: (formData: FormData) => Promise<void>;
  onMarkCompleted?: (formData: FormData) => Promise<void>;
  fetchWork?: undefined;
  fetchCommunications?: undefined;
}

export type WorkDetailPageProps =
  | WorkDetailPageCallbackProps
  | WorkDetailPagePrefetchProps;

function isCallbackProps(props: WorkDetailPageProps): props is WorkDetailPageCallbackProps {
  return typeof (props as WorkDetailPageCallbackProps).fetchWork === "function";
}

/**
 * WorkDetailPage — Thin page shell for all work detail views.
 * TWO usage modes supported:
 *   1. CALLBACK MODE (legacy client-side fetch): pass `fetchWork` + `fetchCommunications`.
 *   2. PREFETCH MODE (server components, RECOMMENDED): pass `initialWork` (+ optional initialCommunications)
 *      already fetched server-side via RSC to avoid client round-trip.
 *
 * ALL business/UI logic lives in `template → experience → features → entities`.
 * This file only does: (1) data source resolve, (2) derivation, (3) composition.
 * Reusable across all domains: LawyersHub, ILC, Services.ID.
 */
export function WorkDetailPage(props: WorkDetailPageProps) {
  const { workId, defaultPerspective = 'operator', onAssignLawyer, onAddEvidence, onMarkCompleted } = props;

  const prefetchedModel = ((): WorkRealityModel | null => {
    if (isCallbackProps(props)) return null;
    // Prefetched mode now REQUIRES server to pass already-built WorkRealityModel
    // aligns with EOS Presentation Architecture: server owns model building
    return props.initialModel as WorkRealityModel;
  })();

  const [clientModel, setClientModel] = useState<WorkRealityModel | null>(null);
  const [loading, setLoading] = useState<boolean>(isCallbackProps(props));

  useEffect(() => {
    if (!isCallbackProps(props)) return;
    let cancelled = false;
    const run = async () => {
      try {
        const [work, communications] = await Promise.all([
          props.fetchWork(workId),
          props.fetchCommunications(workId),
        ]);
        if (cancelled) return;
        // Legacy callback mode now requires fetch to return already-built model
        // New implementation should use server-built model pattern
        setClientModel(work as unknown as WorkRealityModel);
      } catch (err) {
        console.error("[WorkDetailPage] Fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [props, workId]);

  const model: WorkRealityModel | null = isCallbackProps(props)
    ? clientModel
    : prefetchedModel;

  if (loading) {
    return <WorkRealityLoading />;
  }

  if (!model) {
    return (
      <main className="min-h-screen bg-surface-background px-6 py-10 sm:py-16 flex items-center justify-center">
        <a href="#error-content" className="skip-link">Lewati ke konten error</a>
        <div id="error-content" className="mx-auto max-w-lg w-full">
          <Card size="lg" className="text-center">
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-status-danger/10 flex items-center justify-center" aria-hidden="true">
                <svg className="w-8 h-8 text-status-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-text-primary m-0">Work tidak ditemukan</h1>
                <p className="text-sm text-text-secondary leading-relaxed m-0">
                  ID Work yang Anda cari tidak ada di sistem. Mungkin sudah dihapus atau Anda memiliki link yang salah.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <a href="/work" className="no-underline w-full sm:w-auto">
                  <Button intent="primary" variant="solid" size="md" block>
                    Lihat Daftar Work
                  </Button>
                </a>
                <a href="/my-reality" className="no-underline w-full sm:w-auto">
                  <Button intent="neutral" variant="outline" size="md" block>
                    Kembali ke Beranda
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // Debug log for model identity to verify data-testid elements receive correct values
  console.log('[WorkDetailPage] Model identity rendered:', model.identity);
  
  return <WorkRealityTemplate 
    initialModel={model} 
    perspective={defaultPerspective}
  />;
}