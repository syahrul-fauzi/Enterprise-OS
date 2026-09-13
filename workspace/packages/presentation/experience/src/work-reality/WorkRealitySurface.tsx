"use client";

import React from 'react';
import Link from 'next/link';
// Import shared GlobalNavigation component from ui-system
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
// Import semua feature dari shared reality/ features package (semantic reusable blocks)
import { 
  RealityIdentityHeader, 
  RealityWorkHeader,
  RealityNow,
  RealityNext,
  RealityPeople,
  RealityCommunication,
  RealityActivity,
  RealityInspection,
  RealityCoordination,
  RealityEvidence
} from "@repo/presentation-features/reality";
import { Card } from "@repo/presentation-ui-system";
import { type WorkRealityModel, type WorkRealityPerspective, WORK_PERSPECTIVES, type WorkParticipant } from '@repo/presentation-entities';

import { Breadcrumb, type BreadcrumbItem } from "@repo/presentation-ui-system";

interface WorkRealitySurfaceProps {
  readonly model: WorkRealityModel;
  readonly currentPerspective: WorkRealityPerspective;
  readonly onSwitchPerspective: (perspective: WorkRealityPerspective) => void;
  readonly onAssignLawyer?: (formData: FormData) => Promise<void>;
  readonly onAddEvidence?: (formData: FormData) => Promise<void>;
  readonly onMarkCompleted?: (formData: FormData) => Promise<void>;
  readonly onExecuteAction?: (actionId: string) => Promise<void>;
  readonly onSendMessage?: (content: string) => Promise<void>;
  readonly onAddParticipant?: (name: string, role: any) => Promise<void>;
  readonly userCapabilities?: string[]; // VF-02: Pass user capabilities for unified navigation
  readonly productId?: string;           // VF-02: Product ID for workspace navigation
  readonly breadcrumbItems?: readonly BreadcrumbItem[]; // P2: Breadcrumb navigation for work hierarchy (UX-SHELL-002)
}

/**
 * WorkRealitySurface — Core EOS Product Face
 * Komponen utama yang merender seluruh Work Reality Surface menggunakan sub-komponen atomic
 * Dapat menerima perspective apapun (customer/professional/operator/agent) tanpa mengubah model
 * Reuse oleh SEMUA domain: LawyersHub, ILC, Services.ID — one building block, many products
 * PURE COMPOSITION ONLY: NO useState, NO business logic, hanya menerima props dari Controller
 * (Sesuai MyReality golden pattern: Experience = composition only, Controller = runtime + state)
 * VF-02: Uses shared GlobalNavigation component from @repo/presentation/ui-system
 * - Eliminates duplicate navigation code, single source of truth for navigation across all surfaces
 */
export function WorkRealitySurface({
  model,
  currentPerspective,
  onSwitchPerspective,
  onAssignLawyer,
  onAddEvidence,
  onMarkCompleted,
  onExecuteAction,
  onSendMessage,
  onAddParticipant,
  userCapabilities = [],
  productId = "default",
  breadcrumbItems,
}: WorkRealitySurfaceProps) {
  return (
    <GlobalNavigation userCapabilities={userCapabilities} productId={productId}>
      {/* Main content area with preserved WorkRealitySurface structure */}

      <main
        id="work-reality-main"
        role="main"
        className="min-h-screen bg-surface-background px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
      >
        {/* P2: Breadcrumb navigation - rendered before page content, only if items provided (same pattern as MyRealityLayout) */}
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumbItems} size="sm" />
          </div>
        )}
        <a href="#work-reality-main" className="skip-link" aria-label="Lewati ke konten utama">
          Lewati ke konten utama
        </a>

        <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
          <RealityIdentityHeader identity={model.identity} />

        <Card size="md" aria-label="Pemilihan perspektif tampilan">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                  Mode Perspektif
                </p>
                <p className="text-base font-semibold text-text-primary">
                  Lihat Work dari sudut pandang yang berbeda
                </p>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Pilih perspektif"
              className="flex flex-wrap gap-1.5 bg-surface-sunken p-1 rounded-md border border-surface-border"
            >
              {(Object.keys(WORK_PERSPECTIVES) as readonly WorkRealityPerspective[]).map((persp) => {
                const isSelected = currentPerspective === persp;
                return (
                  <button
                    key={persp}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`perspective-panel-${persp}`}
                    id={`perspective-tab-${persp}`}
                    onClick={() => onSwitchPerspective(persp)}
                    className={[
                      "px-3.5 py-2 text-sm font-semibold rounded-sm transition-all duration-eos-fast ease-eos-standard",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                      isSelected
                        ? "bg-brand-primary text-text-inverse shadow-token-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface",
                    ].join(" ")}
                  >
                    {WORK_PERSPECTIVES[persp].label}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`perspective-panel-${currentPerspective}`}
              aria-labelledby={`perspective-tab-${currentPerspective}`}
              className="rounded-lg bg-brand-primary/5 border border-brand-primary/15 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {WORK_PERSPECTIVES[currentPerspective].description}
                  </p>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    Pertanyaan panduan: <span className="italic">&ldquo;{WORK_PERSPECTIVES[currentPerspective].question}&rdquo;</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card size="lg" className="overflow-hidden">
          {/* SINGLE NARRATIVE FLOW - NO KUMPULAN CARD, SATU WORK YANG HIDUP */}
          <div className="divide-y divide-gray-100">
            {/* HERO SECTION - INTRO WORK UNTUK MENCIPTAKAN SINGLE ENTITY */}
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-8">
              <RealityWorkHeader title={model.identity.title} perspective={currentPerspective} />
            </div>

            {/* PR-VISUAL-001: OPERATING ORIENTATION - REFACTORED to use Card primitive for consistency */}
            <Card size="lg" className="bg-surface-critical-subtle border-critical-subtle">
              <div className="px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* KIRI: APA YANG SEDANG TERJADI + SIAPA YANG BERTANGGUNG JAWAB */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">APA YANG SEDANG TERJADI?</h3>
                      <div className="bg-surface rounded-lg p-4 shadow-sm">
                        <RealityNow
                          description={model.state.currentState}
                          status={model.identity.status}
                          perspective={currentPerspective}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">SIAPA YANG BERTANGGUNG JAWAB?</h3>
                      <div className="bg-surface rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap gap-2">
                          {model.participants.map((p: WorkParticipant, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-sm text-text-secondary">
                              {p.role === 'professional' && <span>⚖️</span>}
                              {p.role === 'customer' && <span>👤</span>}
                              {p.role === 'notary' && <span>📜</span>}
                              <span className="font-medium">{p.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TENGAH: APA YANG HARUS SAYA LAKUKAN? (PRIMARY CTA) - OPERATING ORIENTATION */}
                  <div className="md:col-span-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">APA YANG HARUS SAYA LAKUKAN SEKARANG?</h3>
                    <div className="bg-surface rounded-lg p-6 shadow-sm border-2 border-surface-border h-full flex flex-col justify-center">
                      <div className="text-2xl font-bold text-text-primary">{model.state.nextAction}</div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => onExecuteAction?.('primary-action')}
                          className="rounded-lg bg-brand-primary hover:bg-brand-primary-hover px-6 py-3 text-text-inverse font-semibold transition-colors"
                        >
                          LANJUTKAN PEKERJAAN
                        </button>
                        <Link href="/my-reality" className="rounded-lg bg-surface-subtle hover:bg-surface px-6 py-3 text-text-secondary font-semibold transition-colors flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h14" />
                          </svg>
                          Kembali ke Reality
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* REMAINING SECTIONS FOR DEEPER CONTEXT */}
            <div className="px-6 py-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">SEMUA PIHAK TERLIBAT</h3>
              <RealityPeople
                participants={model.participants}
                currentPerspective={currentPerspective}
                workId={model.identity.workId}
                onAddParticipant={onAddParticipant}
              />
            </div>

            {/* COMMUNICATION - PERCAKAPAN DALAM WORK */}
            <div className="px-6 py-6 bg-slate-50/50">
              <RealityCommunication
                communications={model.communications}
                perspective={currentPerspective}
                workId={model.identity.workId}
                onSendMessage={onSendMessage}
              />
            </div>

            {/* APA YANG SUDAH TERJADI? - ACTIVITY HISTORY */}
            <div className="px-6 py-6 bg-slate-50/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">APA YANG SUDAH TERJADI?</h3>
              <RealityActivity
                activity={model.activity}
                perspective={currentPerspective}
                workId={model.identity.workId}
              />
            </div>

            {(currentPerspective === 'operator' || currentPerspective === 'agent') && (
              <div className="px-6 py-6">
                <RealityInspection inspections={model.inspections} perspective={currentPerspective} />
              </div>
            )}

            {/* COORDINATION - TINDAKAN SELANJUTNYA YANG BISA DIJALANKAN */}
            <div className="px-6 py-6 bg-blue-50/30">
              <RealityCoordination
                actions={model.coordination}
                currentPerspective={currentPerspective}
                workId={model.identity.workId}
                onExecuteAction={onExecuteAction}
                onSendMessage={onSendMessage}
              />
            </div>

            {/* EVIDENCE - BUKTI YANG TERKUMPUL */}
            <div className="px-6 py-6">
              <RealityEvidence
                evidence={model.evidence}
                perspective={currentPerspective}
                caseId={model.identity.workId}
                onAddEvidence={onAddEvidence}
              />
            </div>
          </div>
        </Card>
        </div>
      </main>
    </GlobalNavigation>
  );
}