import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { buildMyRealityModel } from "./getMyRealityModel";
import { MyRealityTemplate } from "@repo/presentation-templates";

export default async function MyRealityPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  let session: any = {
    actorId: "anonymous.user",
    sessionId: "session-uat-lh-case-001",
    tenantId: "tenant.anonymous",
    workspaceId: "professional-workspace.anonymous",
    actorLabel: "UAT Tester",
    userCapabilities: [],
  };

  if (sessionCookie?.value) {
    const decodedSession = decodeWorkspaceSession(sessionCookie.value);
    if (decodedSession?.sessionId) {
      session = decodedSession;
    } else {
      // If session is invalid, redirect to login, but this should ideally not happen
      // if the session cookie exists but is malformed.
      redirect("/enter");
    }
  }

  const model = await buildMyRealityModel({
    actorId: session.actorId,
    actorLabel: session.actorLabel,
    workspaceId: session.workspaceId,
    tenantId: session.tenantId,
  });

  return (
    <MyRealityTemplate
      initialModel={model}
      auth={session}
      userCapabilities={session.userCapabilities || []}
    />
  );
}