"use server";

import { ProductCasesPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows existing product route pattern)
interface ProductCasesPageProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly caseId?: string | string[];
  }>;
}

export async function generateMetadata({ params }: ProductCasesPageProps): Promise<Metadata> {
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "cases",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function CasesRoute({ params, searchParams }: ProductCasesPageProps) {
  const { productId = "lawyershub" } = await params;
  const sp = await searchParams;
  const caseId = sp?.caseId;
  const binding = readProductBinding(productId);
  return <ProductCasesPage productId={productId} binding={binding} caseId={caseId} />;
}