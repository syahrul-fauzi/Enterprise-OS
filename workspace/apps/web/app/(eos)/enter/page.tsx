import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";
import { IntentExperience } from "@repo/presentation-experience/intent";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";

export default async function EnterPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    redirect("/");
  }

  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
    redirect("/");
  }

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Mulai Kebutuhan Baru", href: "/enter", current: true },
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