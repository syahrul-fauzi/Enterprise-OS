"use server";

// @ts-ignore: widget source is available at runtime, TypeScript can't resolve package path
import { ProductDocumentsPage } from "@repo/presentation-widgets/product-documents-page/ProductDocumentsPage";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows existing product route pattern)
interface ProductDocumentsPageProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly documentId?: string | string[];
  }>;
}

export async function generateMetadata({ params }: ProductDocumentsPageProps): Promise<Metadata> {
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "documents",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function DocumentsRoute({ params, searchParams }: ProductDocumentsPageProps) {
  const { productId = "lawyershub" } = await params;
  const sp = await searchParams;
  const documentId = sp?.documentId;
  const binding = readProductBinding(productId);
  return <ProductDocumentsPage productId={productId} binding={binding} documentId={documentId} />;
}