import { RootLandingPage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface RootRouteProps {
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function RootRoute({ searchParams }: RootRouteProps) {
  return <RootLandingPage searchParams={searchParams} />;
}