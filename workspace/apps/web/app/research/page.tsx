import { ResearchPage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ResearchPageProps {
  searchParams?: Promise<{
    productId?: string;
    q?: string;
    status?: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ResearchRoute({ searchParams }: ResearchPageProps) {
  return <ResearchPage rawSearchParams={searchParams} />;
}