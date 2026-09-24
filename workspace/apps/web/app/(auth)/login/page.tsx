// GOLDEN-SPINE PAGE - ENABLED: /login is the primary authentication entry point
// This page is part of the core Golden Spine release path and remains enabled.
// It is the first step in the verified chain: /enter → authentication → /my-reality
//
// This page properly exports the LoginPage React component and is required for
// the minimal verification surface to function.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";
import { AuthenticationTemplate } from "../../../../../packages/presentation/templates/src/authentication-template";
import { EnterForm } from "./EnterForm";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  // Hanya redirect jika session BENAR-BENAR valid, jika tidak - selalu tampilkan login page
  // Ini menghindari semua kemungkinan redirect loop, karena server component tidak pernah melakukan redirect kecuali session 100% valid
  if (sessionCookie?.value) {
    try {
      const session = decodeWorkspaceSession(sessionCookie.value);
      if (session && session.tenantId && session.workspaceId && session.actorId) {
        redirect("/my-reality");
      }
      // Jika decode gagal atau session tidak lengkap - TIDAK ADA ACTION, lanjutkan render login page
    } catch (e) {
      // Jika terjadi error apapun saat decode session - TIDAK ADA ACTION, lanjutkan render login page
      console.error("Invalid session cookie, showing login page");
    }
  }

  return (
    <AuthenticationTemplate 
      title="Enter EOS"
      subtitle="Sign in to your Enterprise Operating System workspace"
    >
      <EnterForm />
    </AuthenticationTemplate>
  );
}