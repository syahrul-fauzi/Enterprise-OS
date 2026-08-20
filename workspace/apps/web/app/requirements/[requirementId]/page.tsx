"use server";

import { RequirementDetailPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows existing product route pattern)
interface RequirementDetailRouteProps {
  readonly params: Promise<{
    readonly requirementId: string;
    readonly productId?: string;
  }>;
}

export async function generateMetadata({ params }: RequirementDetailRouteProps): Promise<Metadata> {
  const { requirementId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "requirement-detail",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function RequirementDetailRoute({ params }: RequirementDetailRouteProps) {
  const { requirementId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return <RequirementDetailPage productId={productId} requirementId={requirementId} binding={binding} />;
}