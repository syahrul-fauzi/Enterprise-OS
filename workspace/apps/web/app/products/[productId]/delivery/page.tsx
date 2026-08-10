import type { Metadata } from "next";
import React from "react";
import { ProductPreviewShell } from "@repo/presentation-widgets";
import { DeliveryWorkspace } from "@repo/presentation-widgets";
import { readProductBinding, getProductExperience, readProductRouteMetadata } from "@repo/presentation-experience";

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
  const binding = readProductBinding(params.productId);

  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "delivery",
  );
}

export default async function ProductDeliveryPage(input: ProductDeliveryPageProps) {
  const params = await input.params;
  const searchParams = await input.searchParams;
  const binding = readProductBinding(params.productId);
  const experience = getProductExperience(binding.productId);
  const requirementId = Array.isArray(searchParams.requirementId)
    ? searchParams.requirementId[0]
    : searchParams.requirementId;

  if (!experience) {
    return <div>Product experience not found</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="delivery" />
        <DeliveryWorkspace
          copy={experience.workflow}
          displayName={binding.displayName}
          productId={binding.productId}
          requirementId={requirementId}
        />
      </div>
    </main>
  );
}