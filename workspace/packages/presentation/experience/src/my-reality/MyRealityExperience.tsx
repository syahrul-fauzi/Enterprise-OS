"use client";

import React, { useCallback, useState, useEffect } from "react";
import type { MyRealityModel } from "./contracts/my-reality.contracts";
import { 
  RealityNow, 
  RealityNext, 
  RealityWatching, 
  RealityCompanion, 
  RealityActivity 
} from "@repo/presentation-features/reality";

import { MyRealityLayout } from "./components/MyRealityLayout";
import { MyRealityHeader } from "./components/MyRealityHeader";
import { NeedAttentionSection } from "./components/NeedAttentionSection";
import { ActiveWorkSection } from "./components/ActiveWorkSection";
import { CompletedSection } from "./components/CompletedSection";
import { useMyRealityController } from "./MyRealityController";

interface MyRealityExperienceProps {
  initialModel: MyRealityModel;
  auth?: any;
  actions?: React.ReactNode;
  onInsightAction?: (insightId: string) => void;
  showActivity?: boolean;
}

"use client";

export function MyRealityExperience({ 
  initialModel, 
  auth,
  actions,
  onInsightAction,
  showActivity = true,
}: MyRealityExperienceProps) {
  // Controller owns ALL business logic, realtime, and state management
  // Experience = pure composition of building blocks (PRESENTATION CONSTITUTION #8)
  const {
    model,
    isConnected,
    pendingEvents,
    dispatchAction,
  } = useMyRealityController({ initialModel });
  
  // Greeting based on time of day - calculate client-side only to prevent hydration mismatch
  const [greeting, setGreeting] = useState("Selamat pagi");
  
  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Selamat pagi" : hour < 18 ? "Selamat siang" : "Selamat malam";
    setGreeting(timeGreeting);
  }, []);
  
  // Menghitung jumlah pekerjaan yang butuh perhatian sekarang untuk personalisasi
  const urgentWorks = model.priority.now.length;
  const headerDescription = urgentWorks > 0 
    ? `Ada ${urgentWorks} pekerjaan yang membutuhkan perhatianmu sekarang. Semuanya sudah terorganisir di sini.`
    : "Semua pekerjaanmu teratur. Kamu bisa memeriksa daftar berikut atau mulai pekerjaan baru.";

  // Handle work click navigation - only navigation, no business logic
  const handleWorkClick = useCallback((workId: string) => {
    window.location.href = `/work/${workId}`;
  }, []);

  // Default insight action handler - uses generic dispatcher, NO domain knowledge
  const handleInsightAction = useCallback((insightId: string) => {
    const insight = model.companion.insights.find(i => i.id === insightId);
    if (insight?.actionId) {
      // Generic action dispatch - works for ANY domain capability (PRESENTATION CONSTITUTION #2, #3)
      dispatchAction(insight.actionId, insight.workId);
    }
    onInsightAction?.(insightId);
  }, [model.companion.insights, onInsightAction, dispatchAction]);

  const header = (
    <>
      {/* VF-01: EOS identity in first viewport, VF-05: Authenticated identity visibly resolved */}
      <MyRealityHeader 
        title={`${greeting}, ${model.actor?.displayName || 'Pengguna'}`} 
        description={headerDescription}
        actions={actions}
        auth={auth}
        actorName={model.actor?.displayName}
      />
      {/* Realtime connection status indicator only shows "Menghubungkan..." if actually connecting - VF-07: intentional states */}
      <div className="flex items-center justify-end gap-2 mt-2">
        {!isConnected && (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs text-gray-500">Terhubung ke EOS...</span>
          </>
        )}
        {isConnected && (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs text-gray-500">Terhubung</span>
          </>
        )}
        {isConnected && pendingEvents.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            {pendingEvents.length} pembaruan baru
          </span>
        )}
      </div>
    </>
  );
  
  // PR-VISUAL-001: OPERATING ORIENTATION HIERARCHY (Attention → Active Work → Reality Signals)
  // 1. NEEDS ATTENTION (highest priority first) - exactly as requested in OPERATING ORIENTATION
  // Add state field to all works to match RealityNow/RealityNext expected props - prevents undefined errors
  const normalizedNow = model.priority.now.map(w => ({...w, state: w.state || "blocked"}));
  const normalizedNext = model.priority.next.map(w => ({...w, state: w.state || "in_progress"}));
  const normalizedWatching = model.priority.watching.map(w => ({...w, state: w.state || "open"}));
  
  const needsAttention = normalizedNow.filter(work => work.state === "blocked" || work.bottleneck);
  // 2. ACTIVE WORK - in progress items
  const activeWorks = normalizedNext.filter(work => work.state === "in_progress");
  // 3. REALITY SIGNALS - completed and recent activity
  const completedWorks = normalizedWatching.filter(work => work.state === "completed");

  // Extract single most important work (the ONE thing that needs attention now) - VF-03: What matters now?
  const topPriorityWork = needsAttention[0] || normalizedNow[0];

  // VF-04: Clear hierarchy: Attention > Active Work > Reality Signals
  const attentionSection = needsAttention.length > 0 ? (
    <NeedAttentionSection works={needsAttention} onWorkClick={handleWorkClick} />
  ) : null;
  
  const activeWorkSection = activeWorks.length > 0 ? (
    <ActiveWorkSection works={activeWorks} onWorkClick={handleWorkClick} />
  ) : null;
  
  const realitySignalsSection = completedWorks.length > 0 ? (
    <CompletedSection works={completedWorks} onWorkClick={handleWorkClick} />
  ) : null;

  return (
    <MyRealityLayout
      header={header}
      // VF-02: Pass auth capabilities to unified navigation system
      userCapabilities={auth?.userCapabilities || []}
      productId="lawyershub"
      // 1. HIGHEST PRIORITY: NEEDS ATTENTION - what matters RIGHT NOW
      attention={attentionSection}
      // 2. SECONDARY: ACTIVE WORK - items currently in progress
      active={activeWorkSection}
      // 3. TERTIARY: REALITY SIGNALS - recent updates and completed items
      signals={realitySignalsSection}
      now={
        // Hero card with single primary CTA that explains what happens next (VF-06)
        topPriorityWork ? (
          <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-2xl p-8 text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-2">{needsAttention.length} hal membutuhkan perhatianmu</h2>
            <p className="text-rose-100 mb-6">{topPriorityWork.title}</p>
            <button 
              onClick={() => handleWorkClick(topPriorityWork.workId)}
              className="bg-white text-rose-600 px-6 py-3 rounded-lg font-semibold hover:bg-rose-50 transition-colors"
            >
              Lanjutkan Pekerjaan →
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-2">Semua pekerjaan teratur</h2>
            <p className="text-emerald-100 mb-6">Tidak ada pekerjaan yang membutuhkan perhatianmu sekarang.</p>
            <button 
              onClick={() => window.location.href = "/work"}
              className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
            >
              Lihat Semua Pekerjaan →
            </button>
          </div>
        )
      }
    />
  );
}