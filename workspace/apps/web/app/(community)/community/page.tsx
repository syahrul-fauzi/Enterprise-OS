"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// import { CommunityPage } from '@repo/presentation-widgets'; // Deprecated package - golden spine only
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";

interface CommunityPageProps {
  searchParams?: Promise<{
    productId?: string;
    q?: string;
    type?: string;
    location?: string;
    page?: string;
  }>;
}

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

// NON-GOLDEN-SPINE PAGE - TEMPORARILY ISOLATED PER W003-P7-03 POLICY
export default async function DisabledNonGoldenSpinePage() {
  return null;
}