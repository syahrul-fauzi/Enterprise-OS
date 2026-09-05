"use client";
import { notFound } from "next/navigation";
import { useEffect, useState } from 'react';
import { IntentUnderstandingPreview } from "./IntentUnderstandingPreview";
import type { IntentContract, IntentRefinementPageProps } from "./types";
import Link from "next/link";
import { Button, Card } from "@repo/presentation-ui-system";
import { Spinner } from "@repo/presentation-ui-system/atoms/button";

const SafeLink = Link as any;

export function IntentRefinementPage({ 
  intentId, 
  onBack,
  customCtaLabel = "Bentuk Pekerjaan dari Kebutuhan ini",
  customCtaHref = (id: string) => `/work/new?intentId=${id}`
}: IntentRefinementPageProps) {
  const [intent, setIntent] = useState<IntentContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchIntent = async () => {
      if (!intentId) {
        setIsLoading(false);
        return notFound();
      }
      
      try {
        const res = await fetch(`/api/intent/${intentId}`);
        if (!res.ok) throw new Error('Gagal memuat detail intent. Silakan coba lagi nanti.');
        const data = await res.json();
        setIntent(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga';
        setError(errorMessage);
        console.error('Error fetching intent:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntent();
  }, [intentId]);

  // Loading State (11 visual states: loading)
  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface-background px-6 py-12 flex items-center justify-center">
        <a href="#content" className="skip-link">Lewati ke konten</a>
        <div id="content" className="w-full max-w-4xl mx-auto space-y-8 text-center" aria-busy="true" aria-label="Memuat detail intent">
          <Spinner size="lg" />
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Memuat detail intent...</h2>
            <p className="text-text-secondary">Mohon tunggu sebentar</p>
          </div>
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
            <h3 className="text-xl font-bold text-text-primary mb-2">Gagal Memuat Intent</h3>
            <p className="text-text-secondary max-w-md mx-auto mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/intent/new" className="no-underline">
                <Button intent="primary" variant="solid">
                  Kembali ke Input Kebutuhan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Permission Denied State (11 visual states: permission denied)
  // TODO: Integrate actual session validation from server-side cookies
  const hasPermission = true; // Replace with real session check
  if (!hasPermission) {
    return (
      <main className="min-h-screen bg-surface-background px-6 py-12">
        <a href="#content" className="skip-link">Lewati ke konten</a>
        <div id="content" className="w-full max-w-2xl mx-auto">
          <div className="rounded-3xl border border-status-warning/20 bg-status-warning/5 p-12 shadow-sm text-center">
            <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Akses Ditolak</h3>
            <p className="text-text-secondary max-w-md mx-auto mb-6">Anda tidak memiliki izin untuk melihat detail intent ini.</p>
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

  if (!intent) return notFound();

  const stepIndex = 2;
  const steps: ReadonlyArray<{ readonly label: string; readonly done: boolean; readonly active?: boolean }> = [
    { label: "Input Kebutuhan", done: true },
    { label: "Pemahaman Kebutuhan", done: true, active: true },
    { label: "Pembentukan Pekerjaan", done: false },
  ];

  return (
    <main className="min-h-screen bg-surface-background px-6 py-10 sm:py-12 pb-24">
      <a href="#intent-content" className="skip-link">Lewati ke detail intent</a>
      <div id="intent-content" className="max-w-4xl mx-auto space-y-8">
        <nav aria-label="Step progres" className="w-full">
          <ol className="flex items-center justify-center gap-2 sm:gap-4">
            {steps.map((step, i) => (
              <li key={i} className="flex items-center gap-2 sm:gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                  step.done && step.active
                    ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30"
                    : step.done
                    ? "bg-status-success/10 text-status-success border border-status-success/20"
                    : "bg-surface-sunken text-text-muted border border-surface-border"
                }`}>
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                      step.done
                        ? step.active
                          ? "bg-brand-primary text-text-inverse"
                          : "bg-status-success text-status-success-fg"
                        : "bg-surface-border text-text-secondary"
                    }`}
                    aria-hidden="true"
                  >
                    {step.done ? (step.active ? i + 1 : "✓") : i + 1}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {(() => {
                  if (i >= steps.length - 1) return null;
                  const nextStep = steps[i + 1];
                  const lineActive = nextStep?.done || (step.done && i < stepIndex);
                  return (
                    <div
                      className={`w-6 sm:w-12 h-0.5 rounded-full ${
                        lineActive ? "bg-brand-primary/40" : "bg-surface-border"
                      }`}
                      aria-hidden="true"
                    />
                  );
                })()}
              </li>
            ))}
          </ol>
        </nav>

        <nav aria-label="Breadcrumb" className="text-sm">
          <ol className="flex items-center flex-wrap gap-1.5 text-text-muted">
            <li>
              <SafeLink
                href={onBack ? "#" : "/"}
                onClick={(e: React.MouseEvent) => {
                  if (onBack) {
                    e.preventDefault();
                    onBack();
                  }
                }}
                className="hover:text-text-primary transition-colors inline-flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 15l-5-5 5-5" />
                </svg>
                Beranda
              </SafeLink>
            </li>
            <li aria-hidden="true" className="text-text-muted/60">/</li>
            <li>
              <span className="text-text-secondary">Intent</span>
            </li>
            <li aria-hidden="true" className="text-text-muted/60">/</li>
            <li aria-current="page">
              <span className="text-text-primary font-medium truncate max-w-[12rem] inline-block align-bottom">
                Refinement
              </span>
            </li>
          </ol>
        </nav>

        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border bg-brand-primary/10 text-brand-primary border-brand-primary/30">
              Detail Intent
            </span>
            <h1>Pemahaman Kebutuhan Anda</h1>
            <p className="text-sm text-text-secondary">
              Review pemahaman EOS di bawah ini. Jika sudah sesuai, lanjutkan untuk membentuk pekerjaan.
            </p>
          </div>
        </header>

        <Card size="lg">
          <IntentUnderstandingPreview 
            intent={intent} 
            onConfirm={() => {}} 
            onRevise={() => {}} 
          />
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-2">
          <SafeLink
            href={onBack ? "#" : "/"}
            onClick={(e: React.MouseEvent) => {
              if (onBack) {
                e.preventDefault();
                onBack();
              }
            }}
            className="no-underline order-2 sm:order-1"
          >
            <Button intent="neutral" variant="outline" size="lg">
              Revisi Kebutuhan
            </Button>
          </SafeLink>
          <SafeLink
          href={customCtaHref(intentId)}
          className="no-underline order-1 sm:order-2 sm:w-auto w-full"
        >
          <Button
            intent="primary"
            variant="solid"
            size="lg"
            block
            loading={isSubmitting}
            rightIcon={
              !isSubmitting ? (
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h10m0 0l-3-3m3 3l-3 3" />
                </svg>
              ) : null
            }
          >
            {isSubmitting ? "Membentuk Pekerjaan..." : customCtaLabel}
          </Button>
        </SafeLink>
        </div>
      </div>
    </main>
  );
}