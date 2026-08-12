import { RequirementDetailPage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface RequirementDetailRouteProps {
  readonly params: Promise<{
    readonly productId: string;
    readonly requirementId: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function RequirementDetailRoute({ params }: RequirementDetailRouteProps) {
  const { productId, requirementId } = await params;
  return <RequirementDetailPage productId={productId} requirementId={requirementId} />;
}