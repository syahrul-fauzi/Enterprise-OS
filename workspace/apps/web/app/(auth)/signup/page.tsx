"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/presentation-ui-system";
import { SignupPage } from "@repo/presentation-features";
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";

interface SignupRouteProps {}

async function resolveSessionOrAllowSignup() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  // Jika user sudah login, redirect ke my-reality (tidak boleh akses signup)
  if (sessionCookie?.value) {
    const session = decodeWorkspaceSession(sessionCookie.value);
    if (session && session.sessionId && session.tenantId) {
      redirect("/my-reality");
    }
  }
  return null;
}

export default async function SignupRoute({}: SignupRouteProps) {
  // Panggil session check untuk block user yang sudah login
  await resolveSessionOrAllowSignup();
  
  // Jika tidak ada session valid, tampilkan halaman signup
  return <SignupPage />;
}