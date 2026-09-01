import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { IntentExperience } from "@repo/presentation-experience";

/**
 * R9 — Thin Page Adapter for /intent/new route.
 *
 * BOUNDARY COMPLIANCE:
 * - Page = ROUTE ADAPTER only
 * - No JSX composition beyond passing model to experience
 * - No business logic / API construction / data transformation
 *
 * Full flow:
 *   Route handler → session check → runtime aggregation → buildIntentModel() →
 *   IntentExperience (presentation composition)
 */
export default async function NewIntentPage() {
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

  return <IntentExperience />;
}