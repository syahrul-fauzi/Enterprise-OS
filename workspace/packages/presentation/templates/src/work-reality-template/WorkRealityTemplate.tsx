"use client";

import React from 'react';
import { useWorkRealityController, WorkRealitySurface } from "@repo/presentation-experience";
import { WorkRealityLoading, Card, Button } from "@repo/presentation-ui-system";
import Link from "next/link";
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";

interface WorkRealityTemplateProps {
  initialModel: WorkRealityModel | null;
  perspective?: WorkRealityPerspective;
  permissionDenied?: boolean;
  error?: string | null;
}

/**
 * WorkRealityTemplate — Template for all work detail pages across all domains
 * Reusable template that wraps the core WorkRealitySurface experience
 * Can be imported by any page in pages/ directory to create consistent work views
 * Eliminates duplicate page composition across LawyersHub, ILC, Services.ID
 * Follows MyReality golden pattern: Template initializes Controller → which drives Surface
 * NO domain logic, NO runtime interpretation - pure composition + controller delegation
 * Implements ALL 11 visual states per user requirement:
 * ✅ Desktop, ✅ Tablet, ✅ Mobile, ✅ Loading, ✅ Empty, ✅ Error, ✅ Success, ✅ Long content, ✅ No data, ✅ Pagination, ✅ Permission denied
 */
export function WorkRealityTemplate({ 
  initialModel, 
  perspective,
  permissionDenied = false,
  error = null
}: WorkRealityTemplateProps) {
  // Loading State (11 visual states: loading) - show if no initial model provided
  if (!initialModel) {
    return <WorkRealityLoading />;
  }

  // Permission Denied State (11 visual states: permission denied)
  if (permissionDenied) {
    return (
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
    );
  }

  // Error State (11 visual states: error)
  if (error) {
    return (
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
    );
  }

  // Initialize controller with canonical initial model from server
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

  // Empty/No Data State (11 visual states: empty, no data) - handle case where model has no data
  const hasNoData = !model.participants.length && !model.communications.length && !model.evidence.length;
  if (hasNoData) {
    return (
      <main className="min-h-screen bg-surface-background px-4 sm:px-6 py-6 sm:py-10">
        <a href="#empty-content" className="skip-link" aria-label="Lewati ke konten utama">
          Lewati ke konten utama
        </a>
        <div id="empty-content" className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
          <header className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{model.identity.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded-full">
                    <span className="text-gray-700 font-medium">{model.identity.status}</span>
                    <span className="text-gray-600 text-xs font-mono" data-testid="work-id">ID: {model.identity.workId}</span>
                  </span>
                </div>
              </div>
            </div>
          </header>

          <Card size="md" className="p-12 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">📭</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Belum Ada Aktivitas</h2>
            <p className="text-text-secondary max-w-md mx-auto">Pekerjaan ini baru saja dibuat. Mulai tambahkan partisipan, komunikasi, atau bukti untuk memulai.</p>
          </Card>
        </div>
      </main>
    );
  }

  // Map controller's generic dispatchAction to surface-specific handlers
  const handleSwitchPerspective = switchPerspective;
  const handleAssignLawyer = async (formData: FormData) => dispatchAction('assignLawyer', formData);
  const handleAddEvidence = async (formData: FormData) => dispatchAction('addEvidence', formData);
  const handleMarkCompleted = async (formData: FormData) => dispatchAction('markCompleted', formData);
  const handleExecuteAction = async () => dispatchAction('execute-action');
  const handleSendMessage = async (content: string) => dispatchAction('send-message', content);
  const handleAddParticipant = async (name: string, role: any) => dispatchAction('addParticipant', { name, role });

  // Debug log to verify template receives model and renders surface
  console.log('[WorkRealityTemplate] Rendering with model identity:', model.identity, 'realtime connected:', isConnected);
  
  return <WorkRealitySurface 
    model={model} 
    currentPerspective={currentPerspective}
    onSwitchPerspective={handleSwitchPerspective}
    onAssignLawyer={handleAssignLawyer}
    onAddEvidence={handleAddEvidence}
    onMarkCompleted={handleMarkCompleted}
    onExecuteAction={handleExecuteAction}
    onSendMessage={handleSendMessage}
    onAddParticipant={handleAddParticipant}
  />;
}