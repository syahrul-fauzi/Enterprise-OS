import type { Metadata } from "next";
import { ProductLandingPage } from "@repo/presentation-widgets";
import { readProductBinding, readProductRouteMetadata } from "@repo/presentation-experience";

interface ProductPreviewPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export async function generateMetadata(
  input: ProductPreviewPageProps,
): Promise<Metadata> {
  const params = await input.params;
  const binding = readProductBinding(params.productId);
  return readProductRouteMetadata(binding.productId, binding.displayName, "landing");
}

export default async function ProductPreviewPage(
  input: ProductPreviewPageProps,
) {
  const params = await input.params;
  const binding = readProductBinding(params.productId);
  
  // PURE ROUTE ADAPTER ONLY: All business logic resides in canonical presentation widget
  return <ProductLandingPage 
    productId={binding.productId} 
    binding={binding}
  />;
}