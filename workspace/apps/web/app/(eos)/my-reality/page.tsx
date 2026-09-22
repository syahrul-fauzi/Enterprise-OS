import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { buildMyRealityModel } from "./getMyRealityModel";
import { MyRealityExperience } from "@repo/presentation-experience/my-reality";
import { IntentExperience } from "@repo/presentation-experience/intent";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";

export default async function MyRealityPage() {
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

  const model = await buildMyRealityModel({
    actorId: session.actorId,
    actorLabel: session.actorLabel,
    workspaceId: session.workspaceId,
    tenantId: session.tenantId,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality", current: true },
  ];

  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId="default"
      breadcrumbItems={breadcrumbItems}
    >
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <MyRealityExperience 
          initialModel={model} 
          auth={session}
          actions={
            <a 
              href="/enter"
              className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              Mulai Kebutuhan Baru
            </a>
          }
        />
      </main>
    </GlobalNavigation>
  );
}