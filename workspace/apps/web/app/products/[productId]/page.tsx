import type { Metadata } from "next";
import React from "react";
import ProductPreviewShell from "../../../components/ProductPreviewShell";
import ProductRealityPanel from "../../../components/ProductRealityPanel";
import { readProductPreviewBinding } from "../../../lib/product-binding";
import { readProductRouteMetadata } from "../../../lib/product-presentation";

interface ProductPreviewPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export async function generateMetadata(
  input: ProductPreviewPageProps,
): Promise<Metadata> {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "landing",
  );
}

export default async function ProductPreviewPage(
  input: ProductPreviewPageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing" />
        <ProductRealityPanel productId={binding.productId} />
      </div>
    </main>
  );
}
