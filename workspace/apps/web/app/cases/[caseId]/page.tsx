"use server";

import { CaseDetailPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows existing product route pattern)
interface CaseDetailRouteProps {
  readonly params: Promise<{
    readonly caseId: string;
    readonly productId?: string;
  }>;
}

export async function generateMetadata({ params }: CaseDetailRouteProps): Promise<Metadata> {
  const { caseId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "case-detail",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function CaseDetailRoute({ params }: CaseDetailRouteProps) {
  const { caseId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return <CaseDetailPage productId={productId} caseId={caseId} binding={binding} />;
}