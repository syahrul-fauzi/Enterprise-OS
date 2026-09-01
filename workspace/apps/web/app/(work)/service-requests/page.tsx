"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductServiceRequestsPage } from "@repo/presentation-widgets";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

interface ServiceRequestsRouteProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly productId?: string | string[];
    readonly new?: string;
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

export async function generateMetadata({ params }: ServiceRequestsRouteProps): Promise<Metadata> {
  const { productId = "services-id" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "service-requests",
  );
}

export default async function ServiceRequestsRoute({ params, searchParams }: ServiceRequestsRouteProps) {
  // Canonical session resolution first - follows golden spine pattern
  const session = await resolveSessionOrEnter();
  const { productId = "services-id" } = await params;
  const sp = await searchParams;
  const isNewServiceRequest = sp.new === "service-request";
  const binding = readProductBinding(productId);

  return (
    <ProductServiceRequestsPage 
      productId={productId} 
      binding={binding} 
      session={session} 
      isNewServiceRequest={isNewServiceRequest} 
    />
  );
}