import { RequirementTracePage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface RequirementTraceRouteProps {
  readonly params: Promise<{
    readonly productId: string;
    readonly requirementId: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function RequirementTraceRoute({ params }: RequirementTraceRouteProps) {
  const { productId, requirementId } = await params;
  return <RequirementTracePage productId={productId} requirementId={requirementId} />;
}