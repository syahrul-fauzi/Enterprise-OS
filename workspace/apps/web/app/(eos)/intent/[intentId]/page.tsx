// NON-GOLDEN-SPINE ROUTE - DISABLED TO PREVENT NEXT.JS COMPILATION
// // import { cookies } from "next/headers";
// // import { redirect } from "next/navigation";
// // import {
// //   WORKSPACE_SESSION_COOKIE,
// //   decodeWorkspaceSession,
// // } from "@repo/core-kernel";
// // import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
// // import { IntentRefinementPage } from "@repo/presentation-features";

// // // EOS Face intent detail page - thin server adapter
// // // BOUNDARY COMPLIANCE: apps/web = ROUTE ADAPTER only, no UI composition, no business logic
// // // All UI logic, state management, and feature composition belongs to packages/presentation
// // export default async function IntentDetailPage({
// //   params,
// // }: {
// //   params: { intentId: string };
// // }) {
// //   const cookieStore = await cookies();
// //   const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

// //   if (!sessionCookie?.value) {
// //     redirect("/");
// //   }

// //   let session;
// //   try {
// //     session = decodeWorkspaceSession(sessionCookie.value);
// //   } catch {
// //     cookieStore.delete(WORKSPACE_SESSION_COOKIE);
// //     redirect("/");
// //   }

// //   if (!session) {
// //     cookieStore.delete(WORKSPACE_SESSION_COOKIE);
// //     redirect("/");
// //   }

// //   const { intentId } = params;

// //   const breadcrumbItems = [
// //     { label: "Home", href: "/my-reality" },
// //     {
// //       label: `Intent ${intentId.substring(0, 8)}...`,
// //       href: `/intent/${intentId}`,
// //       current: true,
// //     },
// //   ];

// //   // Pass ONLY required param to experience component - maintains strict separation of concerns
// //   return (
// //     <GlobalNavigation
// //       userCapabilities={session.userCapabilities || []}
// //       productId="default"
// //       breadcrumbItems={breadcrumbItems}
// //     >
// //       <IntentRefinementPage intentId={intentId} />
// //     </GlobalNavigation>
// //   );
// // }