import { cookies } from "next/headers";
import { encodeWorkspaceSession, createAnonymousWorkspaceSession, WORKSPACE_SESSION_COOKIE, validateBoundaryAccess, decodeWorkspaceSession } from "@repo/capabilities-work-core/contracts/work.contracts.js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Validasi boundary access sesuai 6-boundary compliance (identity -> work-core)
  if (!validateBoundaryAccess("identity", "work-core")) {
    console.error("[Reset Session] Boundary access denied: identity domain cannot access work-core");
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  // Gunakan canonical session decoder untuk validasi request yang masuk
  const sessionContext = await decodeWorkspaceSession(request);
  
  // Hapus cookie lama
  cookies().delete(WORKSPACE_SESSION_COOKIE);
  
  // Buat session development baru yang valid (canonical method dari work-core)
  const session = createAnonymousWorkspaceSession();
  const encoded = encodeWorkspaceSession(session);
  
  // Set cookie baru
  cookies().set(WORKSPACE_SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  
  // Redirect ke /my-reality
  return NextResponse.redirect(new URL("/my-reality", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"));
}