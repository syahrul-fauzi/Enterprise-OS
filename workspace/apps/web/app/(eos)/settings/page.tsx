// UX-SETTINGS-001: Server-side route adapter for /settings
// Complies with core frozen constraints - uses existing runtime/persistence without new lifecycle
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";
import { SettingsPage } from "@repo/presentation-widgets/settings-page";

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

export default async function SettingsRoute() {
  // Canonical session resolution pattern - shared across all workspace routes
  const session = await resolveSessionOrEnter();

  // Pass session to client component - no business logic in route adapter
  return <SettingsPage 
    session={session} 
    productId="professional" 
    binding={{}} 
    activeTab="profile" 
  />;
}