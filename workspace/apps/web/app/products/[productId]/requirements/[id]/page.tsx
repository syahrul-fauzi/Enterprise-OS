import type { Metadata } from "next";
import React from "react";
import ProductPreviewShell from "../../../../../../components/ProductPreviewShell";
import { readProductPreviewBinding } from "../../../../../../lib/product-binding";
import RequirementProofPanel from "../../../../../../components/RequirementProofPanel";

interface ProductRequirementDetailPageProps {
  readonly params: Promise<{
    readonly productId: string;
    readonly id: string;
  }>;
}

export default async function ProductRequirementDetailPage(
  input: ProductRequirementDetailPageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="requirements" />
        <RequirementProofPanel productId={params.productId} requirementId={params.id} />
      </div>
    </main>
  );
}