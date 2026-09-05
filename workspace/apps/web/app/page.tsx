import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { RootLandingPage } from '@repo/presentation-widgets';

interface RootRouteProps {
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

export default async function RootPage({ searchParams }: RootRouteProps) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  // Jika session ada dan valid, arahkan ke my-reality (dashboard pengguna)
  if (sessionCookie?.value) {
    let session;
    try {
      session = decodeWorkspaceSession(sessionCookie.value);
    } catch {
      cookieStore.delete(WORKSPACE_SESSION_COOKIE);
      redirect("/login");
    }

    if (session) {
      redirect('/my-reality');
    }
  }

  // Tidak ada session valid, tampilkan halaman landing EOS utama sesuai EOS Face v0.1
  return (
    <RootLandingPage
      brandName="EOS"
      heroTitle="Apa yang perlu Anda selesaikan hari ini?"
      heroSubtitle="EOS memahami apa yang Anda butuhkan, membantu Anda mengubah kebutuhan menjadi pekerjaan terstruktur, dan memastikan semua pihak selaras menyelesaikannya."
      searchParams={searchParams}
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