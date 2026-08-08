import type { Metadata } from "next";
import React from "react";
import ProductPreviewShell from "../../../components/ProductPreviewShell";
import ProductRealityPanel from "../../../components/ProductRealityPanel";
import ProductCreateForm from "../../../components/ProductCreateForm";
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

const REAL_JOB_PRODUCT_IDS = new Set([
  "lawyershub",
  "services-id",
  "ilc",
  "academic",
]);

export default async function ProductPreviewPage(
  input: ProductPreviewPageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);
  const showCreateForm = REAL_JOB_PRODUCT_IDS.has(
    binding.productId.toLowerCase(),
  );
  const createFormProductId =
    binding.productId.toLowerCase() as "lawyershub" | "services-id" | "ilc" | "academic";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing" />
        {showCreateForm ? (
          <ProductCreateForm
            productId={createFormProductId}
            onCreated={() => {
              if (typeof window !== "undefined") {
                window.setTimeout(() => window.location.reload(), 600);
              }
            }}
          />
        ) : null}
        <ProductRealityPanel productId={binding.productId} />
      </div>
    </main>
  );
}
