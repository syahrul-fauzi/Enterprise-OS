import type { Metadata } from "next";
import React from "react";
import ProductPreviewShell from "../../../../components/ProductPreviewShell";
import DeliveryWorkspace from "../../../../components/DeliveryWorkspace";
import { readProductPreviewBinding } from "../../../../lib/product-binding";
import { readProductExperience } from "../../../../lib/product-experience";
import { readProductRouteMetadata } from "../../../../lib/product-presentation";

interface ProductDeliveryPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
  readonly searchParams: Promise<{
    readonly requirementId?: string | string[];
  }>;
}

export async function generateMetadata(
  input: ProductDeliveryPageProps,
): Promise<Metadata> {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "delivery",
  );
}

export default async function ProductDeliveryPage(input: ProductDeliveryPageProps) {
  const params = await input.params;
  const searchParams = await input.searchParams;
  const binding = readProductPreviewBinding(params.productId);
  const experience = readProductExperience(binding.productId);
  const requirementId = Array.isArray(searchParams.requirementId)
    ? searchParams.requirementId[0]
    : searchParams.requirementId;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="delivery" />
        <DeliveryWorkspace
          copy={experience.delivery}
          displayName={binding.displayName}
          productId={binding.productId}
          requirementId={requirementId}
        />
      </div>
    </main>
  );
}
