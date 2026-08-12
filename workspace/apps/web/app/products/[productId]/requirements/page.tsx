"use server";

import { ProductRequirementsPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProductRequirementsPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
  readonly searchParams: Promise<{
    readonly requirementId?: string | string[];
  }>;
}

export async function generateMetadata({ params }: ProductRequirementsPageProps): Promise<Metadata> {
  const { productId } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "requirements",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProductRequirementsRoute({ params, searchParams }: ProductRequirementsPageProps) {
  const { productId } = await params;
  const sp = await searchParams;
  const requirementId = sp?.requirementId;
  const binding = readProductBinding(productId);
  return <ProductRequirementsPage productId={productId} binding={binding} requirementId={requirementId} />;
}