"use client";
import { notFound } from "next/navigation";
import { useEffect, useState } from 'react';
import { IntentUnderstandingPreview } from "./IntentUnderstandingPreview";
import type { IntentContract, IntentRefinementPageProps } from "./types";
import Link from "next/link";

// Fix TypeScript module resolution type mismatch - same pattern as LoginPage.tsx
const SafeLink = Link as any;

/**
 * IntentRefinementPage — Reusable feature untuk halaman detail/refinement intent
 * Bagian dari EOS Face Spine canonical components
 * Menyediakan interface untuk melihat intent yang sudah dibuat dan lanjut ke Work Formation
 * Semua route (eos)/intent/[intentId] hanya perlu import dan pass intentId
 */
export function IntentRefinementPage({ 
  intentId, 
  onBack,
  customCtaLabel = "Bentuk Work dari Intent ini",
  customCtaHref = (id: string) => `/work/new?intentId=${id}`
}: IntentRefinementPageProps) {
  const [intent, setIntent] = useState<IntentContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch intent dari API berdasarkan intentId
  useEffect(() => {
    const fetchIntent = async () => {
      if (!intentId) {
        setIsLoading(false);
        return notFound();
      }
      
      try {
        const res = await fetch(`/api/intent/${intentId}`);
        if (!res.ok) throw new Error('Failed to fetch intent');
        const data = await res.json();
        setIntent(data);
      } catch (error) {
        console.error('Error fetching intent:', error);
        return notFound();
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntent();
  }, [intentId]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat intent...</div>;
  }

  if (!intent) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8 flex items-center justify-between">
          <SafeLink 
            href={onBack ? "#" : "/"}
            onClick={(e: React.MouseEvent) => {
              if (onBack) {
                e.preventDefault();
                onBack();
              }
            }}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Kembali ke EOS Face
          </SafeLink>
          <h1 className="text-2xl font-bold text-slate-900">Detail Intent</h1>
        </header>

        <main>
          <IntentUnderstandingPreview 
            intent={intent} 
            onConfirm={() => {}} 
            onRevise={() => {}} 
          />
          
          <div className="mt-8 flex justify-end">
            <SafeLink
              href={customCtaHref(intentId)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {customCtaLabel}
            </SafeLink>
          </div>
        </main>
      </div>
    </div>
  );
}