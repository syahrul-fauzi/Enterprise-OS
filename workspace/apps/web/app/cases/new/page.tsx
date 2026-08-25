"use server";

import { ProductCasesPage } from "@repo/presentation-widgets/product-cases-page/ProductCasesPage";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import type { Metadata } from "next";

interface NewCaseRouteProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly productId?: string | string[];
  }>;
}

export async function generateMetadata({ params }: NewCaseRouteProps): Promise<Metadata> {
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "cases",
  );
}

export default async function NewCaseRoute({ params, searchParams }: NewCaseRouteProps) {
  const { productId = "lawyershub" } = await params;
  const sp = await searchParams;
  const binding = readProductBinding(productId);
  return <ProductCasesPage productId={productId} binding={binding} />;
}
