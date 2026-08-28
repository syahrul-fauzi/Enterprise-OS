"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { WorkRealityTemplate } from "@repo/presentation-templates";
import { deriveWorkRealityModel } from "@repo/presentation-features";
import { WorkRealityLoading } from "@repo/presentation-ui-system";
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
  initialWork: AnyWorkAggregate;
  initialCommunications?: GenericCommunicationEvent[];
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

  const prefetchedModel = useMemo<WorkRealityModel | null>(() => {
    if (isCallbackProps(props)) return null;
    return deriveWorkRealityModel(
      props.initialWork,
      props.initialCommunications ?? []
    );
  }, [props]);

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
        setClientModel(deriveWorkRealityModel(work, communications));
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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="border rounded-2xl bg-white p-8 shadow-sm text-center">
            <h1 className="text-2xl font-bold">Work not found</h1>
            <p className="mt-2 text-slate-600">The work ID you&#39;re looking for doesn&#39;t exist.</p>
          </div>
        </div>
      </main>
    );
  }

  return <WorkRealityTemplate 
    model={model} 
    perspective={defaultPerspective}
    onAssignLawyer={onAssignLawyer}
    onAddEvidence={onAddEvidence}
    onMarkCompleted={onMarkCompleted}
  />;
}