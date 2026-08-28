"use client";
import { useState, useEffect } from 'react';
import { useSearchParams, redirect } from "next/navigation";
import Link from "next/link";
import { IntentUnderstandingPreview, deriveWorkRealityModel } from "@repo/presentation-features";
import type { IntentContract } from "@repo/presentation-features";

export default function NewWorkPage() {
  const searchParams = useSearchParams();
  const intentId = searchParams.get('intentId');
  const [intent, setIntent] = useState<IntentContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch intent data from API when page loads
  useEffect(() => {
    if (!intentId) {
      redirect('/intent/new');
      return;
    }

    const fetchIntent = async () => {
      try {
        const res = await fetch(`/api/intent/${intentId}`);
        if (!res.ok) throw new Error('Failed to fetch intent');
        const data = await res.json();
        setIntent(data);
      } catch (error) {
        console.error('Error fetching intent:', error);
        redirect('/intent/new');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntent();
  }, [intentId]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat detail intent...</div>;
  }

  if (!intent) return null;

  const handleWorkCreation = async () => {
    // Create work from intent - uses CANONICAL /api/work/create API
    // Maintains context integrity: Intent → Work formation is consistent across all layers
    try {
      const response = await fetch('/api/work/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: intent.resolution.objective,
          description: intent.expression,
          linkedIntentId: intentId, // CONTEXT INTEGRITY: Link Work to its originating Intent
        })
      });

      if (!response.ok) throw new Error('Failed to create work');
      const result = await response.json();
      redirect(`/work/${result.workId}`); // Uses canonical workId from API proxy
    } catch (error) {
      console.error('Error creating work:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8 flex items-center justify-between">
          <Link 
            href={`/intent/${intentId}`}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Kembali ke Detail Intent
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Bentuk Work dari Intent Anda</h1>
        </header>

        <main>
          <IntentUnderstandingPreview 
            intent={intent} 
            onConfirm={handleWorkCreation}
            onRevise={() => redirect(`/intent/${intentId}`)}
          />
        </main>
      </div>
    </div>
  );
}