"use server";

import { DocumentDetailPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY (follows existing product route pattern)
interface DocumentDetailRouteProps {
  readonly params: Promise<{
    readonly documentId: string;
    readonly productId?: string;
  }>;
}

export async function generateMetadata({ params }: DocumentDetailRouteProps): Promise<Metadata> {
  const { documentId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "document-detail",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function DocumentDetailRoute({ params }: DocumentDetailRouteProps) {
  const { documentId, productId = "lawyershub" } = await params;
  const binding = readProductBinding(productId);
  return <DocumentDetailPage productId={productId} documentId={documentId} binding={binding} />;
}