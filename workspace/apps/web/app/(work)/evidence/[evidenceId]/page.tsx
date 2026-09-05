"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductEvidencePage } from "@repo/presentation-widgets";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows golden spine pattern, matches /documents/[documentId])
interface EvidenceDetailRouteProps {
  readonly params: Promise<{
    readonly evidenceId: string;
    readonly productId?: string;
  }>;
}

// Server-side session resolution - canonical pattern reused from golden spine (exact same as other work surfaces)
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

export async function generateMetadata({ params }: EvidenceDetailRouteProps): Promise<Metadata> {
  const { evidenceId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "evidence-detail",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership (boundary compliance)
// All business logic, data fetching, and UI composition in canonical ProductEvidencePage widget
// Boundary maintained: Session resolved server-side, no client-side auth logic
export default async function EvidenceDetailRoute({ params }: EvidenceDetailRouteProps) {
  // Resolve session FIRST - canonical golden spine pattern
  const session = await resolveSessionOrEnter();
  const { evidenceId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return <ProductEvidencePage productId={productId} evidenceId={evidenceId} binding={binding} session={session} />;
}