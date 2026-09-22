// Re-enabled for W004-P1-01 real human session observation
// Added to Golden Spine release path to support full EOS loop verification
// Minimal fix: only session validation + existing component reuse (3 core lines changed)
// Date re-enabled: 2026-09-19
import { cookies } from "next/headers";
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";
import { IntentExperience } from "@repo/presentation-experience/intent";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";

export default async function NewIntentPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    return (
      <main className="p-6">
        <p>Sesi tidak valid. Silakan login kembali.</p>
      </main>
    );
  }

  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
    return (
      <main className="p-6">
        <p>Sesi tidak valid. Silakan login kembali.</p>
      </main>
    );
  }

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Intent", href: "/intent" },
    { label: "Buat Intent Baru", href: "/intent/new", current: true },
  ];

  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId="default"
      breadcrumbItems={breadcrumbItems}
    >
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <IntentExperience 
          initialContext={{
            actorId: session.actorId,
            tenantId: session.tenantId,
            workspaceId: session.workspaceId
          }}
        />
      </main>
    </GlobalNavigation>
  );
}