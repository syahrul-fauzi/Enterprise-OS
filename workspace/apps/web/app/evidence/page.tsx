"use server";

import { ProductDeliveryPage } from "@repo/presentation-widgets/product-delivery-page/ProductDeliveryPage";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import type { Metadata } from "next";

interface EvidenceRouteProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly productId?: string | string[];
  }>;
}

export async function generateMetadata({ params }: EvidenceRouteProps): Promise<Metadata> {
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "delivery",
  );
}

export default async function EvidenceRoute({ params, searchParams }: EvidenceRouteProps) {
  const { productId = "lawyershub" } = await params;
  const sp = await searchParams;
  const binding = readProductBinding(productId);
  return <ProductDeliveryPage productId={productId} binding={binding} />;
}
