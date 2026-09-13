"use client";

import React from 'react';
import { useWorkRealityController, WorkRealitySurface } from "@repo/presentation-experience";
import { WorkRealityLoading, Card, Button, type BreadcrumbItem, EmptyState, WorkList, type WorkItemCardProps } from "@repo/presentation-ui-system";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import { PageHeader } from "@repo/presentation-ui-system/components/page-header";
import Link from "next/link";
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";

export interface WorkRealityTemplateProps {
  initialModel?: WorkRealityModel | null;
  workItems?: WorkItemCardProps[];
  perspective?: WorkRealityPerspective;
  permissionDenied?: boolean;
  error?: string | null;
  userCapabilities?: string[];
  productId?: string;
  breadcrumbItems?: readonly BreadcrumbItem[];
}

export function WorkRealityTemplate({ 
  initialModel, 
  workItems,
  perspective,
  permissionDenied = false,
  error = null,
  userCapabilities = [],
  productId = "default",
  breadcrumbItems
}: WorkRealityTemplateProps) {

  // Work List View
  if (workItems) {
    const pageActions = (
      <div className="flex items-center gap-2">
        <Link href="/work/new">
          <Button intent="primary">Pekerjaan Baru</Button>
        </Link>
      </div>
    );

    return (
      <GlobalNavigation
        userCapabilities={userCapabilities}
        productId={productId}
        breadcrumbItems={breadcrumbItems}
      >
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Daftar Pekerjaan"
            description="Semua pekerjaan yang Anda terlibat di dalamnya."
            actions={pageActions}
          />
          <div className="mt-6">
            {workItems.length > 0 ? (
              <WorkList workItems={workItems} />
            ) : (
              <EmptyState
                title="Tidak Ada Pekerjaan"
                message="Anda belum memiliki pekerjaan. Buat pekerjaan baru untuk memulai."
                icon="📭"
                primaryActionLabel="Buat Pekerjaan Baru"
                onPrimaryAction={() => window.location.href = '/work/new'}
              />
            )}
          </div>
        </main>
      </GlobalNavigation>
    );
  }

  // Work Detail View
  if (!initialModel) {
    return <WorkRealityLoading />;
  }

  if (permissionDenied) {
    return (
        <GlobalNavigation userCapabilities={userCapabilities} productId={productId} breadcrumbItems={breadcrumbItems}>
            <main className="min-h-screen bg-surface-background px-6 py-12">
                <a href="#content" className="skip-link">Lewati ke konten</a>
                <div id="content" className="w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center min-h-[80vh]">
                <Card size="lg" className="w-full max-w-lg text-center">
                    <div className="text-6xl mb-6" aria-hidden="true">🚫</div>
                    <h1 className="text-2xl font-bold text-text-primary mb-3">Akses Ditolak</h1>
                    <p className="text-text-secondary mb-6">Anda tidak memiliki izin untuk mengakses pekerjaan ini. Silakan hubungi administrator jika Anda membutuhkan akses.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/my-reality" className="no-underline">
                        <Button intent="neutral" variant="outline">
                        Kembali ke Daftar Pekerjaan
                        </Button>
                    </Link>
                    </div>
                </Card>
                </div>
            </main>
        </GlobalNavigation>
    );
  }

  if (error) {
    return (
        <GlobalNavigation userCapabilities={userCapabilities} productId={productId} breadcrumbItems={breadcrumbItems}>
            <main className="min-h-screen bg-surface-background px-6 py-12">
                <a href="#content" className="skip-link">Lewati ke konten</a>
                <div id="content" className="w-full max-w-2xl mx-auto">
                <div className="rounded-3xl border border-status-danger/20 bg-status-danger/5 p-12 shadow-sm text-center">
                    <div className="text-6xl mb-4" aria-hidden="true">⚠️</div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Gagal Memuat Pekerjaan</h3>
                    <p className="text-text-secondary max-w-md mx-auto mb-6">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/my-reality" className="no-underline">
                        <Button intent="primary" variant="solid">
                        Kembali ke Daftar Pekerjaan
                        </Button>
                    </Link>
                    </div>
                </div>
                </div>
            </main>
        </GlobalNavigation>
    );
  }

  const {
    model,
    currentPerspective,
    switchPerspective,
    dispatchAction,
    isConnected,
    refreshModel
  } = useWorkRealityController({
    initialModel,
    perspective: perspective || 'operator'
  });

  const handleSwitchPerspective = switchPerspective;
  const handleAssignLawyer = async (formData: FormData) => dispatchAction('assignLawyer', formData);
  const handleAddEvidence = async (formData: FormData) => dispatchAction('addEvidence', formData);
  const handleMarkCompleted = async (formData: FormData) => dispatchAction('markCompleted', formData);
  const handleExecuteAction = async () => dispatchAction('execute-action');
  const handleSendMessage = async (content: string) => dispatchAction('send-message', content);
  const handleAddParticipant = async (name: string, role: any) => dispatchAction('addParticipant', { name, role });

  console.log('[WorkRealityTemplate] Rendering with model identity:', model.identity, 'realtime connected:', isConnected);
  
  const pageActions = (
    <div className="flex items-center gap-2">
      <Button intent="secondary" variant="outline" onClick={refreshModel}>Refresh</Button>
    </div>
  );

  const hasNoData = !model.participants.length && !model.communications.length && !model.evidence.length;

  return (
    <GlobalNavigation
      userCapabilities={userCapabilities}
      productId={productId}
      breadcrumbItems={breadcrumbItems}
    >
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={model.identity.title}
          description={`ID: ${model.identity.workId}`}
          status={model.identity.status}
          actions={pageActions}
        />
        <div className="mt-6">
          {hasNoData ? (
            <EmptyState
                title="Belum Ada Aktivitas"
                message="Pekerjaan ini baru saja dibuat. Mulai tambahkan partisipan, komunikasi, atau bukti untuk memulai."
                icon="📭"
            />
          ) : (
            <WorkRealitySurface 
              model={model} 
              currentPerspective={currentPerspective}
              onSwitchPerspective={handleSwitchPerspective}
              onAssignLawyer={handleAssignLawyer}
              onAddEvidence={handleAddEvidence}
              onMarkCompleted={handleMarkCompleted}
              onExecuteAction={handleExecuteAction}
              onSendMessage={handleSendMessage}
              onAddParticipant={handleAddParticipant}
              userCapabilities={userCapabilities}
              productId={productId}
            />
          )}
        </div>
      </main>
    </GlobalNavigation>
  );
}