"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductRequirementsPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (mengikuti golden spine pattern)
interface ProductRequirementsPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
  readonly searchParams: Promise<{
    readonly requirementId?: string | string[];
    readonly new?: string;
  }>;
}

// Server-side session resolution - mengikuti golden spine MyReality pattern
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

export async function generateMetadata({ params }: ProductRequirementsPageProps): Promise<Metadata> {
  const { productId } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "requirements",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProductRequirementsRoute({ params, searchParams }: ProductRequirementsPageProps) {
  // Resolve session FIRST - canonical pattern dari golden spine
  const session = await resolveSessionOrEnter();
  const { productId } = await params;
  const sp = await searchParams;
  const requirementId = sp?.requirementId;
  const isNewRequirement = sp?.new === "requirement";
  const binding = readProductBinding(productId);
  return <ProductRequirementsPage productId={productId} binding={binding} requirementId={requirementId} session={session} isNewRequirement={isNewRequirement} />;
}