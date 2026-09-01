"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPage } from "@repo/presentation-features";
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";

interface LoginRouteProps {}

async function resolveSessionOrAllowLogin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) return null;
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    // Hapus cookie invalid dan biarkan user login kembali
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    return null;
  }
  // Jika session valid, redirect ke halaman utama workspace
  redirect("/my-reality");
}

export default async function LoginRoute({}: LoginRouteProps) {
  // Cek session dulu - block user yang sudah login
  await resolveSessionOrAllowLogin();
  
  // Jika tidak ada session valid, tampilkan halaman login
  return <LoginPage />;
}