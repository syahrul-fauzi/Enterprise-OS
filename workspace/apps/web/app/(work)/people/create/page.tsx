"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductPeoplePage } from "@repo/presentation-widgets";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

interface CreatePeopleRouteProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly caseId?: string;
  }>;
}

// Server-side session resolution - follows golden spine MyReality pattern
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

export async function generateMetadata({ params }: CreatePeopleRouteProps): Promise<Metadata> {
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "people-create",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
// Boundary compliance: Session resolved server-side, no client-side auth logic
export default async function CreatePeopleRoute({ params, searchParams }: CreatePeopleRouteProps) {
  // Resolve session FIRST - canonical pattern from golden spine
  const session = await resolveSessionOrEnter();
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return <ProductPeoplePage productId={productId} binding={binding} session={session} isNewPerson={true} />;
}