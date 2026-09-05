"use client";
import { useRouter } from "next/navigation";
import { useIntentController } from "./IntentController";
import { IntentNeedInput } from "@repo/presentation-features";
import type { IntentSource, IntentContext } from "@repo/presentation-features";

/**
 * INTENT EXPERIENCE
 * Follows MyReality reference architecture:
 * - COMPOSITION ONLY: No business logic, no domain interpretation
 * - Simply composes semantic features
 * - Delegates all runtime interaction to Controller
 * - Renders only canonical model data from features
 * 
 * Presentation Composition Invariant maintained: Never interprets raw runtime reality
 */
interface IntentExperienceProps {
  initialContext?: IntentContext;
}

export function IntentExperience({ initialContext }: IntentExperienceProps) {
  const router = useRouter();
  const { isProcessing, handleIntentCaptured } = useIntentController();

  const onIntentCaptured = async (expression: string, source: IntentSource, originalContext?: IntentContext) => {
    await handleIntentCaptured(expression, source, router);
  };

  return (
    <div className="min-h-screen bg-surface-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="mb-10 sm:mb-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-primary/10 text-brand-primary mb-5 shadow-token-sm" aria-hidden="true">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456L16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-tight mb-6">Ceritakan pada EOS apa yang perlu Anda selesaikan.</h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
            Anda tidak perlu memformat, mengkategorikan, atau mempersiapkan apapun. Cukup tuliskan apa yang ingin Anda wujudkan, EOS akan mengurus sisanya.
          </p>
        </header>

        <main>
          <IntentNeedInput
            onIntentCaptured={onIntentCaptured}
            disabled={isProcessing}
            submitting={isProcessing}
          />
        </main>

        <footer className="mt-10 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Pengembangan Bisnis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
              Kebutuhan Hukum
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.905 59.905 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
              Semua Kebutuhan Lainnya
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}