import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { buildMyRealityModel } from "./getMyRealityModel";
import { MyRealityTemplate } from "@repo/presentation-templates/my-reality-template/MyRealityTemplate";

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

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch (e) {
    console.error("Failed to decode session cookie, showing invalid session message");
    return (
      <main className="p-6">
        <p>Sesi tidak valid. Silakan login kembali.</p>
      </main>
    );
  }
  
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
    <MyRealityTemplate 
      initialModel={model}
      auth={session}
      breadcrumbItems={breadcrumbItems}
    />
  );
}