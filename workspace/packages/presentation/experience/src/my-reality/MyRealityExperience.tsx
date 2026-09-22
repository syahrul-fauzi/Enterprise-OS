"use client";

import React, { useCallback } from "react";
import { Loader2, FileText } from "lucide-react";
import type { MyRealityModel } from "./contracts/my-reality.contracts";
import { Card, Button } from "@repo/presentation-ui-system";

import { MyRealityLayout } from "./components/MyRealityLayout";
import { MyRealityHeader } from "./components/MyRealityHeader";
import { WorkSection } from "./components/WorkSection";
import { useMyRealityController } from "./MyRealityController";

interface MyRealityExperienceProps {
  initialModel: MyRealityModel;
  auth?: any;
  actions?: React.ReactNode;
  onInsightAction?: (insightId: string) => void;
  showActivity?: boolean;
  breadcrumbItems?: readonly any[]; // Align with contracts BreadcrumbItem type
  productId?: string;
}

export function MyRealityExperience({ 
  initialModel, 
  auth,
  actions,
  onInsightAction,
  showActivity = true,
  breadcrumbItems,
  productId = "default",
}: MyRealityExperienceProps) {
  // Controller owns ALL business logic, realtime, and state management
  // Experience = pure composition of building blocks (PRESENTATION CONSTITUTION #8)
  const {
    model,
    isConnected,
    pendingEvents,
    dispatchAction,
    categorizedWorks,
    isLoading,
    hasError,
    errorMessage,
    refreshModel,
  } = useMyRealityController({ initialModel });
  
  // const headerDescription = "A summary of your work items that require action or are in progress.";

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

  const header: null = null;

  // Determine the top priority work item for the header
  const topPriorityWork = categorizedWorks.needsAttention[0] || model.priority.now[0];

  const attentionSection = (
    <WorkSection
      title="What needs your attention"
      works={categorizedWorks.needsAttention}
      onWorkClick={handleWorkClick}
    />
  );

  const activeWorkSection = (
    <WorkSection
      title="Active Work"
      works={categorizedWorks.active}
      onWorkClick={handleWorkClick}
    />
  );

  const realitySignalsSection = (
    <WorkSection
      title="Completed"
      works={categorizedWorks.completed}
      onWorkClick={handleWorkClick}
    />
  );

  // Sama persis dengan /work/page.tsx untuk konsistensi loading/error/empty states
  const mainContent = isLoading ? (
    <Card size="lg" className="text-center py-16">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-status-info" />
        <p className="text-text-secondary">Memuat realitas pekerjaan Anda...</p>
      </div>
    </Card>
  ) : hasError ? (
    <Card size="lg" className="text-center py-16">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 bg-status-error/10 rounded-full flex items-center justify-center">
          <svg className="h-8 w-8 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-text-primary">Gagal memuat realitas</h3>
        <p className="text-text-secondary max-w-md">{errorMessage}</p>
        <Button intent="primary" variant="outline" onClick={refreshModel}>
          Coba Lagi
        </Button>
      </div>
    </Card>
  ) : categorizedWorks.needsAttention.length === 0 && categorizedWorks.active.length === 0 && categorizedWorks.completed.length === 0 ? (
    <Card size="lg" className="text-center py-16">
      <div className="flex flex-col items-center gap-4">
        <div className="mx-auto h-20 w-20 bg-surface-muted rounded-full flex items-center justify-center">
          <FileText className="h-10 w-10 text-text-muted" />
        </div>
        <h3 className="mt-4 text-2xl font-semibold text-text-primary">Belum ada pekerjaan</h3>
        <p className="mt-2 text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
          Semua pekerjaan Anda akan muncul di sini. Mulailah dengan membuat pekerjaan pertama untuk memulai perjalanan di EOS.
        </p>
        <a href="/enter" className="mt-4">
          <Button intent="primary" variant="solid" size="lg">
            Mulai Kebutuhan Pertama
          </Button>
        </a>
      </div>
    </Card>
  ) : (
    <>
      {attentionSection}
      {activeWorkSection}
      {realitySignalsSection}
    </>
  );

  if (isLoading) {
    return (
      <MyRealityLayout
        header={header}
        userCapabilities={auth?.userCapabilities || []}
        productId={productId}
        breadcrumbItems={breadcrumbItems}
        attention={mainContent}
        active={null}
        signals={null}
      />
    );
  }

  if (hasError) {
    return (
      <MyRealityLayout
        header={header}
        userCapabilities={auth?.userCapabilities || []}
        productId={productId}
        breadcrumbItems={breadcrumbItems}
        attention={mainContent}
        active={null}
        signals={null}
      />
    );
  }

  if (categorizedWorks.needsAttention.length === 0 && categorizedWorks.active.length === 0 && categorizedWorks.completed.length === 0) {
    return (
      <MyRealityLayout
        header={header}
        userCapabilities={auth?.userCapabilities || []}
        productId={productId}
        breadcrumbItems={breadcrumbItems}
        attention={mainContent}
        active={null}
        signals={null}
      />
    );
  }

  return (
    <MyRealityLayout
      header={header}
      // VF-02: Pass auth capabilities to unified navigation system
      userCapabilities={auth?.userCapabilities || []}
      productId={productId}
      breadcrumbItems={breadcrumbItems}
      // 1. HIGHEST PRIORITY: NEEDS ATTENTION - what matters RIGHT NOW
      attention={attentionSection}
      // 2. SECONDARY: ACTIVE WORK - items currently in progress
      active={activeWorkSection}
      // 3. TERTIARY: REALITY SIGNALS - recent updates and completed items
      signals={realitySignalsSection}
    />
  );
}