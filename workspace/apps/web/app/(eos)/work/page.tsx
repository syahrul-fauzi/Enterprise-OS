// 
// import { cookies } from "next/headers";
// import {
//   WORKSPACE_SESSION_COOKIE,
//   decodeWorkspaceSession
// } from "@repo/core-kernel";
// import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
// import { WorkListExperience } from "@repo/presentation-experience";
// 
// export default async function WorkPage() {
//   const cookieStore = await cookies();
//   const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
//   
//   if (!sessionCookie?.value) {
//     return (
//       <main className="p-6">
//         <p>Sesi tidak valid. Silakan login kembali.</p>
//       </main>
//     );
//   }
// 
//   const session = decodeWorkspaceSession(sessionCookie.value);
//   if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
//     return (
//       <main className="p-6">
//         <p>Sesi tidak valid. Silakan login kembali.</p>
//       </main>
//     );
//   }
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession
} from "@repo/core-kernel";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import { WorkListExperience } from "@repo/presentation-experience";

export default async function WorkPage() {
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
    { label: "My Work", href: "/work", current: true },
  ];

  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId="default"
      breadcrumbItems={breadcrumbItems}
    >
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <WorkListExperience workspaceId={session.workspaceId} />
      </main>
    </GlobalNavigation>
  );
}