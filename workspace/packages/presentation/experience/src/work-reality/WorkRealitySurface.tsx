"use client";

import React from 'react';
import Link from 'next/link';
import { useState } from "react";
import { createWorkspaceNavigation, type NavigationDescriptor, type NavigationItem } from "@repo/composition/navigation";
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
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";
import { WORK_PERSPECTIVES } from "@repo/presentation-entities";

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
}

/**
 * WorkRealitySurface — Core EOS Product Face
 * Komponen utama yang merender seluruh Work Reality Surface menggunakan sub-komponen atomic
 * Dapat menerima perspective apapun (customer/professional/operator/agent) tanpa mengubah model
 * Reuse oleh SEMUA domain: LawyersHub, ILC, Services.ID — one building block, many products
 * PURE COMPOSITION ONLY: NO useState, NO business logic, hanya menerima props dari Controller
 * (Sesuai MyReality golden pattern: Experience = composition only, Controller = runtime + state)
 * VF-02: Implements UNIFIED NAVIGATION same as /my-reality - consistent global navigation across blast radius
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
}: WorkRealitySurfaceProps) {
  // VF-02: Global navigation from unified source - matches human mental model: Reality > Work > Actors > Products
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigation: NavigationDescriptor = createWorkspaceNavigation(productId, userCapabilities);
  const navItems = navigation.items;

  return (
    <>
      {/* UX-SHELL-001: Sticky Global Navigation Header - identical to /my-reality, ProductPreviewShell */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand - EOS only per PR-VISUAL-001 requirements */}
            <div className="flex items-center">
              <Link href="/my-reality" className="text-xl font-bold text-slate-900 tracking-tight">
                EOS
              </Link>
            </div>

            {/* Desktop Navigation - hidden on mobile */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item: NavigationItem) => {
                // Skip separator items in desktop navigation
                if (item.kind === "separator") return null;
                // Hide items that require capabilities user doesn't have
                if (item.capabilityId && !userCapabilities.includes(item.capabilityId)) return null;
                return (
                  <Link
                    key={item.id}
                    href={item.href || "/"}
                    className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu button - visible only on mobile */}
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - only visible when open on mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="container mx-auto px-4 py-4 sm:px-6">
              <nav className="flex flex-col gap-3">
                {navItems.map((item: NavigationItem) => {
                  // Handle separator items in mobile navigation
                  if (item.kind === "separator") {
                    return <hr key={item.id} className="border-slate-200 my-1" />;
                  }
                  // Hide items that require capabilities user doesn't have
                  if (item.capabilityId && !userCapabilities.includes(item.capabilityId)) return null;
                  return (
                    <Link
                      key={item.id}
                      href={item.href || "/"}
                      className="text-base font-medium text-slate-600 transition hover:text-slate-900"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      <main
        id="work-reality-main"
        role="main"
        className="min-h-screen bg-surface-background px-4 sm:px-6 py-6 sm:py-10"
      >
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

            {/* HERO WORK REALITY SECTION - ANSWER 5 KEY QUESTIONS IN 3 SECONDS */}
            {/* PR-VISUAL-001: OPERATING ORIENTATION - MATCH /my-reality visual hierarchy */}
            <div className="px-6 py-8 bg-gradient-to-r from-red-600 to-rose-700 border-b border-red-700 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KIRI: APA YANG SEDANG TERJADI + SIAPA YANG BERTANGGUNG JAWAB */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-100 mb-2">APA YANG SEDANG TERJADI?</h3>
                    <div className="bg-white/95 rounded-lg p-4 shadow-sm">
                      <RealityNow
                        description={model.state.currentState}
                        status={model.identity.status}
                        perspective={currentPerspective}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-100 mb-2">SIAPA YANG BERTANGGUNG JAWAB?</h3>
                    <div className="bg-white/95 rounded-lg p-4 shadow-sm">
                      <div className="flex flex-wrap gap-2">
                        {model.participants.map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">
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
                   <h3 className="text-xs font-bold uppercase tracking-wider text-red-100 mb-2">APA YANG HARUS SAYA LAKUKAN SEKARANG?</h3>
                   <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-white h-full flex flex-col justify-center">
                     <div className="text-2xl font-bold text-slate-900">{model.state.nextAction}</div>
                     <div className="mt-4 flex flex-wrap gap-3">
                       <button
                         onClick={() => onExecuteAction?.('primary-action')}
                         className="rounded-lg bg-red-700 hover:bg-red-800 px-6 py-3 text-white font-semibold transition-colors"
                       >
                         LANJUTKAN PEKERJAAN
                       </button>
                       <Link href="/my-reality" className="rounded-lg bg-slate-100 hover:bg-slate-200 px-6 py-3 text-slate-700 font-semibold transition-colors flex items-center gap-2">
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
    </>
  );
}