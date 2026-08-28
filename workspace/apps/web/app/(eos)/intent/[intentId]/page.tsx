"use client";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState, use } from 'react';
import { IntentUnderstandingPreview, WorkFormationButton } from "@repo/presentation-features";
import type { IntentContract } from "@repo/presentation-features";
import Link from "next/link";

interface IntentDetailPageProps {
  params: Promise<{
    intentId: string;
  }>;
}

// Ini adalah surface untuk context Intent (EOS primitive utama)
// Route ini berada di (eos) route group, URL publik tetap: /intent/[intentId]
// Menggunakan canonical WorkFormationButton dari presentation package - thin route shell
export default function IntentDetailPage({ params }: IntentDetailPageProps) {
  const { intentId } = use(params);
  const [intent, setIntent] = useState<IntentContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch intent dari API berdasarkan intentId - implementasi real persistence
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
          <Link 
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Kembali ke EOS Face
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Detail Intent</h1>
        </header>

        <main>
          <IntentUnderstandingPreview 
            intent={intent} 
            onConfirm={() => {}} 
            onRevise={() => {}} 
          />
          
          <div className="mt-8 flex justify-end">
            <WorkFormationButton
              intent={intent}
              intentId={intentId}
            />
          </div>
        </main>
      </div>
    </div>
  );
}