"use server";

import { InstitutionPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface InstitutionPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    productId?: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function InstitutionRoute({ params, searchParams }: InstitutionPageProps) {
  const { id: institutionId } = await params;
  const sp = await searchParams;
  const productId = sp?.productId || 'academic';
  const binding = readProductBinding(productId);
  return <InstitutionPage institutionId={institutionId} productId={productId} binding={binding} />;
}