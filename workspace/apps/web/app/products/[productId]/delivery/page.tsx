"use server";

import { ProductDeliveryPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProductDeliveryRouteProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export async function generateMetadata({ params }: ProductDeliveryRouteProps): Promise<Metadata> {
  const { productId } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "delivery",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProductDeliveryRoute({ params }: ProductDeliveryRouteProps) {
  const { productId } = await params;
  const binding = readProductBinding(productId);
  return <ProductDeliveryPage productId={productId} binding={binding} />;
}