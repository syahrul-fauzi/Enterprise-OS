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
  // EXECUTION COCKPIT TABS - sesuai spesifikasi FACE Visual System v1
  const [activeTab, setActiveTab] = React.useState<string>('overview');
  const executionTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'actors', label: 'Actors' },
    { id: 'actions', label: 'Actions' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'context', label: 'Context' },
  ];
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
          {/* EXECUTION COCKPIT TABS - sesuai spesifikasi FACE Visual System v1 */}
          <div className="overflow-hidden">
            {/* HERO SECTION - INTRO WORK UNTUK MENCIPTAKAN SINGLE ENTITY */}
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-8">
              <RealityWorkHeader title={model.identity.title} perspective={currentPerspective} />
            </div>

            {/* TAB NAVIGATION FOR EXECUTION COCKPIT */}
            <div className="px-6 py-4 bg-white border-b border-gray-100">
              <div
                role="tablist"
                aria-label="Execution workspace tabs"
                className="flex flex-wrap gap-1.5 bg-surface-sunken p-1 rounded-md border border-surface-border"
              >
                {executionTabs.map((tab) => {
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={`execution-panel-${tab.id}`}
                      id={`execution-tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        "px-4 py-2 text-sm font-semibold rounded-sm transition-all duration-eos-fast ease-eos-standard",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                        isSelected
                          ? "bg-brand-primary text-text-inverse shadow-token-sm"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface",
                      ].join(" ")}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OVERVIEW TAB PANEL - ALWAYS SHOWED FIRST, CONTAINS OPERATING ORIENTATION */}
            {activeTab === 'overview' && (
              <div role="tabpanel" id="execution-panel-overview" aria-labelledby="execution-tab-overview" className="divide-y divide-gray-100">
                <Card size="lg" className="bg-surface-critical-subtle border-critical-subtle rounded-none border-0">
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
              </div>
            )}

            {/* ACTIVITY TAB PANEL - History + Communications */}
            {activeTab === 'activity' && (
              <div role="tabpanel" id="execution-panel-activity" aria-labelledby="execution-tab-activity" className="divide-y divide-gray-100">
                {/* COMMUNICATION - PERCAKAPAN DALAM WORK */}
                <div className="px-6 py-6 bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">KOMUNIKASI TERBARU</h3>
                  <RealityCommunication
                    communications={model.communications}
                    perspective={currentPerspective}
                    workId={model.identity.workId}
                    onSendMessage={onSendMessage}
                  />
                </div>
                {/* APA YANG SUDAH TERJADI? - ACTIVITY HISTORY */}
                <div className="px-6 py-6 bg-slate-50/30">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">SEJARAH AKTIVITAS</h3>
                  <RealityActivity
                    activity={model.activity}
                    perspective={currentPerspective}
                    workId={model.identity.workId}
                  />
                </div>
              </div>
            )}

            {/* ACTORS TAB PANEL - All Participants */}
            {activeTab === 'actors' && (
              <div role="tabpanel" id="execution-panel-actors" aria-labelledby="execution-tab-actors" className="divide-y divide-gray-100">
                <div className="px-6 py-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">SEMUA PIHAK TERLIBAT</h3>
                  <RealityPeople
                    participants={model.participants}
                    currentPerspective={currentPerspective}
                    workId={model.identity.workId}
                    onAddParticipant={onAddParticipant}
                  />
                </div>
              </div>
            )}

            {/* ACTIONS TAB PANEL - Next Actions */}
            {activeTab === 'actions' && (
              <div role="tabpanel" id="execution-panel-actions" aria-labelledby="execution-tab-actions" className="divide-y divide-gray-100">
                <div className="px-6 py-6 bg-blue-50/30">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">TINDAKAN SELANJUTNYA</h3>
                  <RealityCoordination
                    actions={model.coordination}
                    currentPerspective={currentPerspective}
                    workId={model.identity.workId}
                    onExecuteAction={onExecuteAction}
                    onSendMessage={onSendMessage}
                  />
                </div>
              </div>
            )}

            {/* EVIDENCE TAB PANEL - Collected Proof */}
            {activeTab === 'evidence' && (
              <div role="tabpanel" id="execution-panel-evidence" aria-labelledby="execution-tab-evidence" className="divide-y divide-gray-100">
                <div className="px-6 py-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">BUKTI YANG TERKUMPUL</h3>
                  <RealityEvidence
                    evidence={model.evidence}
                    perspective={currentPerspective}
                    caseId={model.identity.workId}
                    onAddEvidence={onAddEvidence}
                  />
                </div>
              </div>
            )}

            {/* CONTEXT TAB PANEL - Domain-specific Context Data (FACE Visual System v1) */}
            {activeTab === 'context' && (
              <div role="tabpanel" id="execution-panel-context" aria-labelledby="execution-tab-context" className="divide-y divide-gray-100">
                {/* DOMAIN-SPECIFIC CONTEXT - Ditampilkan untuk SEMUA user, bukan hanya operator */}
                <div className="px-6 py-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">KONTEKS DOMAIN PRODUK</h3>
                  
                  {/* LawyersHub (Case Domain) - Context untuk kasus hukum */}
                  {productId === 'lawyershub' && (
                    <div className="space-y-6">
                      {/* PRODUCT LIFECYCLE - Product spine yang terhubung ke product universe requirements */}
                      <div className="bg-violet-50 rounded-xl p-5 border border-violet-100">
                        <h4 className="text-sm font-semibold text-violet-900 mb-4">🔗 Product Lifecycle LawyersHub</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-violet-300 bg-violet-100 text-violet-900">Requirement Captured</span>
                          <div className="h-px w-4 bg-violet-300"></div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-violet-300 bg-violet-100 text-violet-900">Work Formed</span>
                          <div className="h-px w-4 bg-violet-300"></div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-violet-600 bg-violet-500 text-white">{model.identity.status === 'in_progress' ? 'In Progress' : model.identity.status === 'draft' ? 'Draft' : model.identity.status === 'closed' ? 'Completed' : 'Open'}</span>
                          <div className="h-px w-4 bg-violet-300"></div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-violet-300 bg-violet-100 text-violet-900">Delivered</span>
                        </div>
                        <div className="mt-4">
                          <Link 
                            href={`/products/lawyershub/requirements`}
                            className="inline-flex text-xs font-medium text-violet-600 hover:text-violet-800"
                          >
                            Lihat semua requirement & delivery →
                          </Link>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                          <h4 className="text-sm font-semibold text-indigo-900 mb-3">📋 Detail Kasus Hukum</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-indigo-700">Status Kasus:</span>
                              <span className="text-xs font-medium text-indigo-900">{model.identity.status === 'in_progress' ? 'Dalam Proses' : model.identity.status === 'draft' ? 'Draf' : model.identity.status === 'closed' ? 'Selesai' : 'Terbuka'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-indigo-700">Tipe Kasus:</span>
                              <span className="text-xs font-medium text-indigo-900">Pendirian Perusahaan</span>
                            </div>
                            <Link 
                              href={`/cases/${model.identity.workId}`}
                              className="inline-flex mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              Lihat detail lengkap kasus →
                            </Link>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">📄 Dokumen Terkait</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">📎</span>
                              <span className="text-xs text-slate-700">akta_pendirian.pdf</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">📎</span>
                              <span className="text-xs text-slate-700">nib_perusahaan.pdf</span>
                            </div>
                            <Link 
                              href={`/documents?workId=${model.identity.workId}`}
                              className="inline-flex mt-3 text-xs font-medium text-slate-600 hover:text-slate-800"
                            >
                              Lihat semua dokumen →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Services.ID (Service Request Domain) - Context untuk permintaan layanan */}
                  {productId === 'services-id' && (
                    <div className="space-y-6">
                      {/* PRODUCT LIFECYCLE - Product spine yang terhubung ke product universe requirements */}
                      <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
                        <h4 className="text-sm font-semibold text-teal-900 mb-4">🔗 Product Lifecycle Services.ID</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-teal-300 bg-teal-100 text-teal-900">Request Submitted</span>
                          <div className="h-px w-4 bg-teal-300"></div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-teal-300 bg-teal-100 text-teal-900">Provider Matched</span>
                          <div className="h-px w-4 bg-teal-300"></div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-teal-600 bg-teal-500 text-white">{model.identity.status === 'in_service' ? 'In Service' : model.identity.status === 'accepted' ? 'Accepted' : model.identity.status === 'delivered' ? 'Delivered' : 'Draft'}</span>
                          <div className="h-px w-4 bg-teal-300"></div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-teal-300 bg-teal-100 text-teal-900">Completed</span>
                        </div>
                        <div className="mt-4">
                          <Link 
                            href={`/products/services-id/delivery`}
                            className="inline-flex text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Lihat semua delivery & requirement →
                          </Link>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                          <h4 className="text-sm font-semibold text-emerald-900 mb-3">🛠️ Detail Permintaan Layanan</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-emerald-700">Status Layanan:</span>
                              <span className="text-xs font-medium text-emerald-900">{model.identity.status === 'in_service' ? 'Sedang Dikerjakan' : model.identity.status === 'accepted' ? 'Diterima' : model.identity.status === 'delivered' ? 'Terkirim' : 'Draf'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-emerald-700">Kategori:</span>
                              <span className="text-xs font-medium text-emerald-900">Legal Consultation</span>
                            </div>
                            <Link 
                              href={`/services/${model.identity.workId}`}
                              className="inline-flex mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-800"
                            >
                              Lihat detail permintaan →
                            </Link>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">📦 Provider Terkait</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">👤</span>
                              <span className="text-xs text-slate-700">PT Legal Solutions Indonesia</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">⭐</span>
                              <span className="text-xs text-slate-700">Rating: 4.9/5.0</span>
                            </div>
                            <Link 
                              href={`/providers/${model.identity.workId}`}
                              className="inline-flex mt-3 text-xs font-medium text-slate-600 hover:text-slate-800"
                            >
                              Profil lengkap provider →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ILC (Indonesia Lawyers Club) PRODUCT LIFECYCLE */}
                  {productId === 'ilc' && (
                    <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                      <h4 className="text-sm font-semibold text-orange-900 mb-4">🔗 Product Lifecycle Indonesia Lawyers Club</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-orange-300 bg-orange-100 text-orange-900">Proposed</span>
                        <div className="h-px w-4 bg-orange-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-orange-300 bg-orange-100 text-orange-900">Accepted</span>
                        <div className="h-px w-4 bg-orange-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-orange-600 bg-orange-500 text-white">{model.identity.status === 'published' ? 'Published' : model.identity.status === 'draft' ? 'Draft' : model.identity.status === 'archived' ? 'Archived' : 'Open'}</span>
                        <div className="h-px w-4 bg-orange-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-orange-300 bg-orange-100 text-orange-900">Archived</span>
                      </div>
                      <div className="mt-4">
                        <Link 
                          href={`/products/ilc/discussions`}
                          className="inline-flex text-xs font-medium text-orange-600 hover:text-orange-800"
                        >
                          Lihat semua artikel & publikasi →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Academic Community PRODUCT LIFECYCLE */}
                  {productId === 'academic' && (
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                      <h4 className="text-sm font-semibold text-blue-900 mb-4">🔗 Product Lifecycle Academic Community</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-blue-300 bg-blue-100 text-blue-900">Submitted</span>
                        <div className="h-px w-4 bg-blue-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-blue-300 bg-blue-100 text-blue-900">Peer Reviewed</span>
                        <div className="h-px w-4 bg-blue-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-blue-600 bg-blue-500 text-white">{model.identity.status === 'published' ? 'Published' : model.identity.status === 'review' ? 'In Review' : model.identity.status === 'rejected' ? 'Rejected' : 'Draft'}</span>
                        <div className="h-px w-4 bg-blue-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-blue-300 bg-blue-100 text-blue-900">Cited</span>
                      </div>
                      <div className="mt-4">
                        <Link 
                          href={`/products/academic/articles`}
                          className="inline-flex text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Lihat semua publikasi akademik →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* CommsME PRODUCT LIFECYCLE */}
                  {productId === 'commsme' && (
                    <div className="bg-pink-50 rounded-xl p-5 border border-pink-100">
                      <h4 className="text-sm font-semibold text-pink-900 mb-4">🔗 Product Lifecycle CommsME</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-pink-300 bg-pink-100 text-pink-900">Project Created</span>
                        <div className="h-px w-4 bg-pink-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-pink-300 bg-pink-100 text-pink-900">Team Assigned</span>
                        <div className="h-px w-4 bg-pink-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-pink-600 bg-pink-500 text-white">{model.identity.status === 'in_progress' ? 'In Progress' : model.identity.status === 'planning' ? 'Planning' : model.identity.status === 'completed' ? 'Completed' : 'Open'}</span>
                        <div className="h-px w-4 bg-pink-300"></div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-pink-300 bg-pink-100 text-pink-900">Delivered</span>
                      </div>
                      <div className="mt-4">
                        <Link 
                          href={`/products/commsme/projects`}
                          className="inline-flex text-xs font-medium text-pink-600 hover:text-pink-800"
                        >
                          Lihat semua project & milestone →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Default Context untuk product lain */}
                  {!['lawyershub', 'services-id', 'ilc', 'academic', 'commsme'].includes(productId) && (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">ℹ️ Konteks Umum Work</h4>
                      <p className="text-xs text-slate-600">Work ini berjalan di domain produk: {productId}. Semua konteks spesifik domain akan tampil di sini sesuai dengan tipe work Anda.</p>
                    </div>
                  )}
                </div>

                {/* INSPEKSI SISTEM - Hanya untuk operator/agent (tetap dipertahankan) */}
                {(currentPerspective === 'operator' || currentPerspective === 'agent') && (
                  <div className="px-6 py-6 border-t border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">INSPEKSI & KONTEKS SISTEM</h3>
                    <RealityInspection inspections={model.inspections} perspective={currentPerspective} />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        </div>
      </main>
    </GlobalNavigation>
  );
}