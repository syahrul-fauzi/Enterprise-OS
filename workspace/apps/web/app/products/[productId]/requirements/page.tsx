import { ProductRequirementsPage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProductRequirementsPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
  readonly searchParams: Promise<{
    readonly requirementId?: string | string[];
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProductRequirementsRoute({ params, searchParams }: ProductRequirementsPageProps) {
  const { productId } = await params;
  return <ProductRequirementsPage productId={productId} rawSearchParams={searchParams} />;
}