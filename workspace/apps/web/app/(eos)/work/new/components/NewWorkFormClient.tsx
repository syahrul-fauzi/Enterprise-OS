"use client";

// Client-boundary component for /work/new submission form - maintains full session authority from server
// Isolates client-side state (useState, useRouter) from server-side session resolution and command execution
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { IntentUnderstandingPreview } from "@repo/presentation-features";
import type { IntentContract } from "@repo/presentation-features";

interface NewWorkFormClientProps {
  intent: IntentContract | null;
  intentId: string | null;
  sessionCookieValue: string;
  session: {
    tenantId: string;
    workspaceId: string;
    actorId: string;
  };
  handleWorkCreation: (formData: { title: string; objective: string; description: string }) => Promise<void>;
}

export function NewWorkFormClient({
  intent,
  intentId,
  sessionCookieValue,
  session,
  handleWorkCreation,
}: NewWorkFormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Page metadata derived from server props
  const pageTitle = intent ? "Mulai Pekerjaan dari Kebutuhan" : "Buat Pekerjaan Baru";
  const pageSubtitle = intent 
    ? "Tinjau dan konfirmasi detail pekerjaan dari kebutuhan Anda." 
    : "Jelaskan pekerjaan yang ingin Anda selesaikan dan hasil yang ingin dicapai.";
  const backLinkHref = intent ? `/intent/${intentId}` : "/work";
  const backLinkText = intent ? "Kembali ke Detail Kebutuhan" : "Kembali ke Daftar Pekerjaan";

  return (
    <div className="min-h-screen bg-surface-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <Link
            href={backLinkHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {backLinkText}
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" aria-hidden="true" />
            {intent ? "Langkah 2 dari 2: Bentuk Pekerjaan" : "Langkah 1 dari 1: Buat Pekerjaan"}
          </div>
        </header>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{pageTitle}</h1>
          <p className="mt-2 text-text-secondary leading-relaxed">
            {pageSubtitle}
          </p>
          {intent && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-brand-primary bg-brand-primary/5 px-3 py-1.5 rounded-full">
              <span className="font-medium">Sumber:</span> Kebutuhan / Intent
            </div>
          )}
          {!intent && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary bg-surface-muted px-3 py-1.5 rounded-full">
              <span className="font-medium">Sumber:</span> Dimulai langsung oleh Anda
            </div>
          )}
        </div>

        <main>
          {intent ? (
            // Mode B: Intent-derived Work - reuse existing preview component
            <IntentUnderstandingPreview
              intent={intent}
              isSubmitting={isSubmitting}
              onConfirm={async () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  await handleWorkCreation({
                    title: intent.resolution.objective,
                    objective: intent.resolution.objective,
                    description: intent.expression
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              onRevise={() => router.push(`/intent/${intentId}`)}
            />
          ) : (
            // Mode A: Direct Work - manual input form for direct work creation
            <div className="bg-white rounded-xl shadow-sm border border-border-subtle p-6 sm:p-8">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                
                setIsSubmitting(true);
                try {
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const objective = formData.get('objective') as string;
                  const description = formData.get('description') as string;
                  
                  if (!title || !objective) {
                    throw new Error("Judul dan Tujuan harus diisi.");
                  }
                  
                  await handleWorkCreation({ title, objective, description });
                } finally {
                  setIsSubmitting(false);
                }
              }}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-2">
                      Judul Pekerjaan *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all"
                      placeholder="Contoh: Urus izin lingkungan perusahaan"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="objective" className="block text-sm font-medium text-text-primary mb-2">
                      Tujuan / Hasil yang Diinginkan *
                    </label>
                    <textarea
                      id="objective"
                      name="objective"
                      required
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all resize-none"
                      placeholder="Deskripsikan hasil akhir yang ingin Anda capai dari pekerjaan ini..."
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
                      Deskripsi / Konteks Tambahan
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all resize-none"
                      placeholder="Tambahkan informasi tambahan, dokumen yang tersedia, atau hal lain yang relevan..."
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row gap-4 justify-end">
                    <Link
                      href="/work"
                      className="px-6 py-3 rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-muted transition-colors text-center font-medium"
                    >
                      Batal
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors text-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Membuat Pekerjaan..." : "Buat Pekerjaan"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}