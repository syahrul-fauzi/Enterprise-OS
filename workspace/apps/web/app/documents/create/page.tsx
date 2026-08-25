"use server";

import { ProductDocumentsPage } from "@repo/presentation-widgets/product-documents-page/ProductDocumentsPage";
import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
import { readProductRouteMetadata } from "@repo/presentation-experience/catalog.js";
import type { Metadata } from "next";

interface CreateDocumentRouteProps {
  readonly params: Promise<{
    readonly productId?: string;
  }>;
  readonly searchParams: Promise<{
    readonly caseId?: string | string[];
    readonly documentId?: string | string[];
  }>;
}

export async function generateMetadata({ params }: CreateDocumentRouteProps): Promise<Metadata> {
  const { productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "documents",
  );
}

export default async function CreateDocumentRoute({ params, searchParams }: CreateDocumentRouteProps) {
  const { productId = "lawyershub" } = await params;
  const sp = await searchParams;
  const documentId = sp?.documentId;
  const binding = readProductBinding(productId);
  return <ProductDocumentsPage productId={productId} binding={binding} documentId={documentId} />;
}
