// LawyersHub CTA Route - /work/cases/new → redirects to NewWorkPage with legal-case workType
// Implements Law-001: End-to-end legal case creation flow
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export default async function NewLegalCasePage() {
  // Server-side session check to maintain authentication requirements
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    redirect("/");
  }

  let session;
  try {
    session = await decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  if (!session) {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  // Redirect to NewWorkPage with legal-case workType pre-selected
  redirect("/work/new?workType=legal-case");
}