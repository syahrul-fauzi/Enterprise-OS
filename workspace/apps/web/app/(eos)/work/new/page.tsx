// Thin Server Adapter for /work/new - maintains boundary compliance with MyReality reference
// Follows golden spine pattern: Route → Server Adapter → Experience (no client-side business logic)
// Session verification + intent fetching happens server-side, only pass resolved model to presentation
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { IntentUnderstandingPreview } from "@repo/presentation-features";
import type { IntentContract } from "@repo/presentation-features";

// Server-side intent fetching - matches canonical pattern from getWorkRealityModel
async function fetchIntentServerSide(intentId: string): Promise<IntentContract | null> {
  try {
    // Reuse canonical API endpoint - server-side fetch to maintain boundary integrity
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/intent/${intentId}`, {
      cache: "no-store", // Disable caching for fresh intent data
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("[SERVER] Error fetching intent:", error);
    return null;
  }
}

export default async function NewWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ intentId?: string }>;
}) {
  // Server-side session check - identical pattern to MyReality reference
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    redirect("/");
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  if (!session) {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  // Extract intentId from searchParams server-side
  const { intentId } = await searchParams;
  if (!intentId) {
    redirect("/intent/new");
  }

  // Server-side intent fetching - eliminates client-side data fetching
  const intent = await fetchIntentServerSide(intentId);
  if (!intent) {
    redirect("/intent/new");
  }

  // Work creation callback executed server-side, maintains separation of concerns
  const handleWorkCreation = async () => {
    // Create work from intent - uses CANONICAL /api/work/create API
    // Maintains context integrity: Intent → Work formation is consistent across all layers
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/work/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: intent.resolution.objective,
          description: intent.expression,
          linkedIntentId: intentId,
          domain: "general",
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId
        })
      });

      if (!response.ok) throw new Error('Failed to create work');
      const result = await response.json();
      
      redirect(`/work/${result.workId}`);
    } catch (error) {
      console.error('Error creating work:', error);
    }
  };

  return (
    <div className="min-h-screen bg-surface-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <Link
            href={`/intent/${intentId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Kembali ke Detail Kebutuhan
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" aria-hidden="true" />
            Langkah 2 dari 2: Bentuk Pekerjaan
          </div>
        </header>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Bentuk Pekerjaan dari Kebutuhan Anda</h1>
          <p className="mt-2 text-text-secondary leading-relaxed">
            Tinjau pemahaman EOS terhadap kebutuhan Anda. Jika sudah sesuai, lanjutkan untuk membentuk pekerjaan.
          </p>
        </div>

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