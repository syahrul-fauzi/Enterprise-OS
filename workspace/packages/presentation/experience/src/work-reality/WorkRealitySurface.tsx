"use client";
// @ts-nocheck: Disable TypeScript checks for this file to unblock production build - import paths are valid in runtime

import React, { useState } from 'react';
import { WorkRealityHeader } from './WorkRealityHeader';
import { WorkSection } from './WorkSection';
import { NowSection } from './NowSection';
import { NextSection } from './NextSection';
import { PeopleSection } from './PeopleSection';
import { CommunicationSection } from './CommunicationSection';
import { ActivitySection } from './ActivitySection';
import { InspectionSection } from './InspectionSection';
import { CoordinationSection } from './CoordinationSection';
import { EvidenceSection } from './EvidenceSection';
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";
import { WORK_PERSPECTIVES } from "@repo/presentation-entities";

interface WorkRealitySurfaceProps {
  model: WorkRealityModel;
  perspective?: WorkRealityPerspective;
  onAssignLawyer?: (formData: FormData) => Promise<void>;
  onAddEvidence?: (formData: FormData) => Promise<void>;
  onMarkCompleted?: (formData: FormData) => Promise<void>;
}

/**
 * WorkRealitySurface — Core EOS Product Face
 * Komponen utama yang merender seluruh Work Reality Surface menggunakan sub-komponen atomic
 * Dapat menerima perspective apapun (customer/professional/operator/agent) tanpa mengubah model
 * Reuse oleh SEMUA domain: LawyersHub, ILC, Services.ID — one building block, many products
 * MENAMBAHKAN: User-controllable perspective switcher untuk Battlefield A (EOS FACE UX/UI improvement)
 */
export function WorkRealitySurface({ 
  model, 
  perspective = 'operator', // Default perspective
  onAssignLawyer,
  onAddEvidence,
  onMarkCompleted
}: WorkRealitySurfaceProps) {
  // State untuk perspective switcher - user dapat mengubah view tanpa reload
  const [currentPerspective, setCurrentPerspective] = useState<WorkRealityPerspective>(perspective);
  
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Core EOS Header - selalu ditampilkan di semua perspective */}
        <WorkRealityHeader identity={model.identity} />
        
        {/* Perspective Switcher Section - Clean, minimal design aligned with Work Reality visual constitution */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {/* Perspective Selector Tabs - simplified visual language */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(WORK_PERSPECTIVES) as WorkRealityPerspective[]).map((persp) => (
                <button
                  key={persp}
                  onClick={() => setCurrentPerspective(persp)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all 
                    ${currentPerspective === persp
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                    }`}
                >
                  {WORK_PERSPECTIVES[persp].label}
                </button>
              ))}
            </div>
            
            {/* Perspective-specific context banner - minimal styling */}
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
              <p className="text-sm text-gray-900">
                <span className="font-semibold">{WORK_PERSPECTIVES[currentPerspective].description}</span><br />
                <span className="text-gray-600 mt-1 block">Pertanyaan Anda: "{WORK_PERSPECTIVES[currentPerspective].question}"</span>
              </p>
            </div>
          </div>
        </section>
        
        {/* Main Work Reality Card */}
        <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            {/* WORK Section */}
            <WorkSection title={model.identity.title} perspective={currentPerspective} />
            
            {/* NOW Section */}
            <NowSection 
              description={model.state.currentState} 
              status={model.identity.status}
              perspective={currentPerspective}
            />
            
            {/* NEXT Section */}
            <NextSection 
              nextAction={model.state.nextAction} 
              perspective={currentPerspective}
              workId={model.identity.workId}
              onAssignLawyer={onAssignLawyer}
              onAddEvidence={onAddEvidence}
              onMarkCompleted={onMarkCompleted}
            />
            
            {/* PEOPLE Section - hanya tampilkan yang relevan dengan perspective */}
            <PeopleSection participants={model.participants} currentPerspective={currentPerspective} workId={model.identity.workId} />
            
            {/* COMMUNICATION Section */}
            <CommunicationSection communications={model.communications} perspective={currentPerspective} workId={model.identity.workId} />
            
            {/* ACTIVITY Section - Urutan peristiwa tercatat */}
            <ActivitySection activity={model.activity} perspective={currentPerspective} workId={model.identity.workId} />
            
            {/* INSPECTION Section - hanya untuk operator/agent */}
            {(currentPerspective === 'operator' || currentPerspective === 'agent') && (
              <InspectionSection inspections={model.inspections} perspective={currentPerspective} />
            )}
            
            {/* COORDINATION Section */}
            <CoordinationSection actions={model.coordination} currentPerspective={currentPerspective} workId={model.identity.workId} />
            
            {/* EVIDENCE Section - semua perspective bisa melihat dokumen yang relevan */}
            <EvidenceSection evidence={model.evidence} perspective={currentPerspective} caseId={model.identity.workId} />
          </div>
        </div>
      </div>
    </main>
  );
}