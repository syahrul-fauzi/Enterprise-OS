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

  // Tidak ada session valid, tampilkan halaman landing EOS utama
  return (
    <RootLandingPage
      brandName="EOS"
      heroTitle="Pekerjaan Anda, terhubung sempurna."
      heroSubtitle="Platform enterprise yang menghubungkan semua pihak dalam satu Workspace yang aman. Satu tempat untuk mengelola seluruh pekerjaan, dokumen, dan kolaborasi tim."
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