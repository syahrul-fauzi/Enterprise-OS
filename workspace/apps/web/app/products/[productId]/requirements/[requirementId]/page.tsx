import type { Metadata } from "next";
import React from "react";
import { ProductPreviewShell } from "@repo/presentation-widgets";
import { readProductBinding, readProductRouteMetadata } from "@repo/presentation-experience";
import { RequirementProofPanel } from "@repo/presentation-ui-system";

interface ProductRequirementDetailPageProps {
  readonly params: Promise<{
    readonly productId: string;
    readonly requirementId: string;
  }>;
}

export async function generateMetadata(
  input: ProductRequirementDetailPageProps,
): Promise<Metadata> {
  const params = await input.params;
  const binding = readProductBinding(params.productId);

  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    `requirements/${params.requirementId}`,
  );
}

export default async function ProductRequirementDetailPage(
  input: ProductRequirementDetailPageProps,
) {
  const params = await input.params;
  const binding = readProductBinding(params.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="requirements" />
        <RequirementProofPanel productId={params.productId} requirementId={params.requirementId} />
      </div>
    </main>
  );
}