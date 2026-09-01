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
  const headerDescription = "Apa yang sedang terjadi dengan pekerjaan saya, dan apa yang harus saya lakukan sekarang?";

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
  const topWork = model.priority.now[0];
  return (
    <MyRealityLayout
      header={header}
      now={
        topWork ? (
          <RealityNow 
            description={topWork.description || topWork.title}
            status={topWork.state}
            perspective="professional"
          />
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