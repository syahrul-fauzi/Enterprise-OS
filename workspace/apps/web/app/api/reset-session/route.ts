// NON-GOLDEN-SPINE ROUTE - DISABLED TO PREVENT NEXT.JS COMPILATION
// import { cookies } from "next/headers";
// import { encodeWorkspaceSession, createAnonymousWorkspaceSession, WORKSPACE_SESSION_COOKIE } from "@repo/core-kernel/registry";
// import { NextResponse } from "next/server";

// export async function GET() {
//   // Hapus cookie lama
//   cookies().delete(WORKSPACE_SESSION_COOKIE);
  
//   // Buat session development baru yang valid
//   const session = createAnonymousWorkspaceSession();
//   const encoded = encodeWorkspaceSession(session);
  
//   // Set cookie baru
//   cookies().set(WORKSPACE_SESSION_COOKIE, encoded, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     path: "/",
//   });
  
//   // Redirect ke /my-reality
//   return NextResponse.redirect(new URL("/my-reality", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"));
// }