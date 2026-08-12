import { RequirementProofPage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface RequirementProofRouteProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function RequirementProofRoute({ params }: RequirementProofRouteProps) {
  const { id: requirementId } = await params;
  return <RequirementProofPage requirementId={requirementId} />;
}