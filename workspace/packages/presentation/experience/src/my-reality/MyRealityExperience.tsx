"use client";

import React, { useCallback } from "react";
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
import { useMyRealityController } from "./MyRealityController";

interface MyRealityExperienceProps {
  initialModel: MyRealityModel;
  auth?: any;
  actions?: React.ReactNode;
  onInsightAction?: (insightId: string) => void;
  showActivity?: boolean;
}

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
  
  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Selamat pagi" : hour < 18 ? "Selamat siang" : "Selamat malam";
  
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
      <MyRealityHeader 
        title={greeting} 
        description={headerDescription}
        actions={actions}
        auth={auth}
      />
      {/* Realtime connection status indicator from controller */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
        <span className="text-xs text-gray-500">{isConnected ? 'Realtime terhubung' : 'Menghubungkan...'}</span>
        {pendingEvents.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            {pendingEvents.length} pembaruan baru
          </span>
        )}
      </div>
    </>
  );
  
  // PURE COMPOSITION ONLY - no business logic, no state mutation, no API calls
  // Experience only composes building blocks from features/reality (PRESENTATION CONSTITUTION #8)
  // Ambil pekerjaan paling penting untuk hero card
  const topWork = model.priority.now[0];
  
  // Buat hero card untuk satu fokus utama
  const priorityHero = topWork ? (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 mb-8 max-w-3xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
            SATU HAL YANG PALING MEMBUTUHKAN ANDA
          </h3>
          <p className="text-2xl font-bold text-gray-900 mb-3">{topWork.title}</p>
          <p className="text-gray-600">{topWork.description || "Pekerjaan ini memerlukan perhatian Anda segera."}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-1">Sekarang:</h4>
            <p className="text-gray-800">{topWork.state === "waiting-for-me" ? "Menunggu informasi dari Anda" : topWork.state}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-1">Next Action:</h4>
            <p className="text-gray-800">{topWork.nextAction || "Lanjutkan pekerjaan ini"}</p>
          </div>
        </div>
        
        <div className="pt-4">
          <button 
            onClick={() => handleWorkClick(topWork.id)}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Lanjutkan pekerjaan →
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Sisa pekerjaan lain untuk section LANJUTAN LAINNYA
  const otherWorks = model.priority.now.slice(1).concat(model.priority.next);

  return (
    <MyRealityLayout
      header={header}
      now={priorityHero}
      next={
        otherWorks.length > 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lanjutan Lainnya</h3>
            <ul className="space-y-3">
              {otherWorks.map(work => (
                <li key={work.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => handleWorkClick(work.id)}>
                  <span className="font-medium text-gray-800">{work.title}</span>
                  <span className="text-sm text-gray-500">{work.state === "waiting-for-me" ? "Menunggu Anda" : "Menunggu actor lain"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      }
      next={
        <RealityNext 
          works={[...model.priority.now, ...model.priority.next]} 
          currentActorId={model.actor.id}
          onWorkClick={handleWorkClick}
        />
      }
      watching={
        <RealityWatching 
          works={model.priority.watching} 
          onWorkClick={handleWorkClick}
        />
      }
      companion={
        model.companion.insights.length > 0 
          ? <RealityCompanion insights={model.companion.insights} onInsightAction={handleInsightAction} /> 
          : undefined
      }
      activity={
        showActivity ? <RealityActivity items={model.activity} onWorkClick={handleWorkClick} /> : undefined
      }
    />
  );
}