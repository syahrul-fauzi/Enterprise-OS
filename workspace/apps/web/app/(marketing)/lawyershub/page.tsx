"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RootLandingPage } from '@repo/presentation-widgets';
import { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } from "@repo/core-kernel";

interface RootRouteProps {
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

async function resolveSessionOrEnter() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) return null;
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    return null;
  }
  return session;
}

export default async function LawyersHubMarketingPage({ searchParams }: RootRouteProps) {
  const session = await resolveSessionOrEnter();
  return (
    <RootLandingPage
      brandName="LawyersHub EOS"
      heroTitle="Pekerjaan Hukum Anda, terhubung sempurna."
      heroSubtitle="Platform hukum enterprise yang menghubungkan semua pihak dalam satu Workspace yang aman. Satu tempat untuk mengelola seluruh kasus, kontrak, dan persyaratan legal."
      searchParams={searchParams}
      session={session}
      theme={{
        primaryColor: 'blue',
        cardBgClass: 'bg-blue-600',
        cardTextClass: 'text-blue-100',
        buttonBgClass: 'bg-white',
        buttonTextClass: 'text-blue-600',
        buttonHoverBgClass: 'hover:bg-slate-100'
      }}
    />
  );
}