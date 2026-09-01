"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CommunityPage } from '@repo/presentation-widgets';
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

export default async function CommunityRoute({ searchParams }: CommunityPageProps) {
  const session = await resolveSessionOrEnter();
  const sp = await searchParams;
  const productId = sp?.productId || 'ilc';
  const searchQuery = sp?.q || '';
  const filterType = sp?.type || 'all';
  const filterLocation = sp?.location || 'all';
  const currentPage = parseInt(sp?.page || '1', 10);
  const binding = readProductBinding(productId);
  
  return <CommunityPage 
    productId={productId}
    binding={binding}
    session={session}
    searchQuery={searchQuery}
    filterType={filterType}
    filterLocation={filterLocation}
    currentPage={currentPage}
    pageSize={10}
  />;
}