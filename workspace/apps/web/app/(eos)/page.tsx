import { RootLandingPage } from '@repo/presentation-widgets';

interface RootRouteProps {
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

export default async function RootRoute({ searchParams }: RootRouteProps) {
  return (
    <RootLandingPage
      brandName="LawyersHub EOS"
      heroTitle="Pekerjaan Anda, terhubung sempurna."
      heroSubtitle="Platform hukum enterprise yang menghubungkan semua pihak dalam satu Workspace yang aman. Satu tempat untuk mengelola seluruh kasus, kontrak, dan persyaratan legal."
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