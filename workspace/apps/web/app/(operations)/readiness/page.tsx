"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductPreviewShell, ReadinessPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows golden spine pattern)
interface ReleaseReadinessPageProps {
  readonly searchParams: Promise<{
    readonly surface?: string;
    readonly releaseId?: string;
    readonly productId?: string;
  }>;
}

// Server-side session resolution - follows canonical pattern from /my-reality
async function resolveSessionOrEnter() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) redirect("/enter");
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    redirect("/enter");
  }
  return session;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Release Readiness | EOS Operations",
    description: "Monitor production release readiness and deployment status",
  };
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
// Boundary compliance: Session resolved server-side, no client-side auth logic
export default async function ReleaseReadinessRoute({ searchParams }: ReleaseReadinessPageProps) {
  // Resolve session FIRST - canonical pattern from golden spine
  const session = await resolveSessionOrEnter();
  const sp = await searchParams;
  const productId = sp?.productId || 'academic';
  const binding = readProductBinding(productId);
  
  // Pass all server-side data to canonical widget - thin adapter pattern
  return <ReadinessPage 
    productId={productId}
    binding={binding}
    session={session}
    surface={sp?.surface}
    releaseId={sp?.releaseId}
    searchParams={sp}
  />;
}