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
  
  // Jika sudah ada session valid, redirect ke /my-reality sesuai flow EOS P2-USE-001
  if (sessionCookie?.value) {
    const session = decodeWorkspaceSession(sessionCookie.value);
    if (session && session.tenantId && session.workspaceId && session.actorId) {
      redirect("/my-reality");
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