"use client";
import { useState } from 'react';
import { useRouter } from "next/navigation";
import { IntentNeedInput } from "@repo/presentation-features";
import type { IntentSource, IntentContext } from "@repo/presentation-features";

export default function NewIntentPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Handler ketika intent berhasil di-capture oleh IntentNeedInput
  const handleIntentCaptured = async (expression: string, source: IntentSource, context?: IntentContext) => {
    setIsProcessing(true);
    console.log("[INTENT] 📥 Intent captured:", expression, source, context);
    
    try {
      const resolvedIntent = {
        id: crypto.randomUUID(),
        expression,
        source,
        context,
        resolution: {
          objective: "Establish a PT for my new business.",
          context: "Legal / Company Formation",
          expectedOutcome: "PT successfully established with complete legal documentation",
          workType: "Legal Case",
          confidence: 0.95
        },
        status: "draft",
        createdAt: new Date().toISOString()
      };
      
      // Simpan intent ke database via API - matches canonical /api/intent/* route structure
      const response = await fetch('/api/intent/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolvedIntent),
      });

      if (!response.ok) {
        throw new Error('Failed to save intent to server');
      }

      const result = await response.json();
      console.log("[INTENT] 💾 Intent disimpan ke database:", result.intentId);
      
      router.push(`/intent/${result.intentId}`);
    } catch (error) {
      console.error("[INTENT] ❌ Gagal menyimpan intent:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Apa yang ingin Anda capai?</h1>
          <p className="text-slate-600">Jelaskan kebutuhan Anda, EOS akan membantu membentuk Work yang tepat.</p>
        </header>
        
        <main>
          <IntentNeedInput
            onIntentCaptured={handleIntentCaptured}
            disabled={isProcessing}
          />
        </main>
      </div>
    </div>
  );
}