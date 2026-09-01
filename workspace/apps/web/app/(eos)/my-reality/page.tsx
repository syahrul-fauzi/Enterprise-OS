import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

import { buildMyRealityModel } from "./getMyRealityModel";
import { MyRealityExperience } from "@repo/presentation-experience/my-reality/MyRealityExperience";

/**
 * R9 — Thin Page Adapter for /my-reality route.
 *
 * BOUNDARY COMPLIANCE:
 * - Page = ROUTE ADAPTER only
 * - No JSX composition beyond passing model to experience
 * - No business logic / API construction / data transformation
 *
 * Full flow:
 *   Route handler → session check → runtime aggregation → buildMyRealityModel() →
 *   MyRealityExperience (presentation composition)
 */
export default async function MyRealityPage() {
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

  const model = await buildMyRealityModel({
    actorId: session.actorId,
    actorLabel: session.actorLabel,
    workspaceId: session.workspaceId,
    tenantId: session.tenantId,
  });

  return <MyRealityExperience initialModel={model} auth={session} />;
}