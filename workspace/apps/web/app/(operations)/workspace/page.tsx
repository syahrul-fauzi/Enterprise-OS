"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkspaceDashboard as WorkspaceWidget } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { getAllWorksForWorkspace } from "../../api/work/create/route";

// Server-side session resolution - follows golden spine MyReality pattern
async function resolveSessionOrEnter() {
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
  return session;
}

// Define proper Next.js page props - PURE ADAPTER ONLY
interface WorkspacePageProps {
  searchParams?: Promise<{
    productId?: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
// Boundary compliance: Session resolved server-side, no client-side auth logic
export default async function WorkspaceRoute({ searchParams }: WorkspacePageProps) {
  // Resolve session FIRST - canonical pattern from golden spine
  const session = await resolveSessionOrEnter();
  const sp = await searchParams;
  const productId = sp?.productId || 'academic';
  const binding = readProductBinding(productId);
  
  // Fetch work items server-side to pass to widget (thin adapter pattern)
  let workItems: Array<{ id: string; title: string; description?: string; status: string }> = [];
  try {
    const canonicalWorks = getAllWorksForWorkspace(session.workspaceId);
    workItems = canonicalWorks.map(cw => ({
      id: cw.workId,
      title: cw.title ?? 'Untitled Work',
      description: cw.description ?? '',
      status: cw.status ?? 'open',
    }));
  } catch (err) {
    console.error("[WorkspacePage] Failed to list work items:", err);
  }

  return <WorkspaceWidget 
    productId={productId}
    binding={binding}
    session={session}
    searchParams={sp}
    workItems={workItems}
  />;
}