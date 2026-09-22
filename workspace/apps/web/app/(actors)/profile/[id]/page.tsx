"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// import { ProfilePage } from '@repo/presentation-widgets'; // Deprecated package - golden spine only
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    productId?: string;
  }>;
}

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

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
// Boundary compliance: Session resolved server-side, no client-side auth logic
// NON-GOLDEN-SPINE PAGE - TEMPORARILY ISOLATED PER W003-P7-03 POLICY
export default async function DisabledNonGoldenSpinePage() {
  return null;
}