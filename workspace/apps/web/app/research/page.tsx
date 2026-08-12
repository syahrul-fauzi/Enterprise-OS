"use server";

import { ResearchPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ResearchPageProps {
  searchParams?: Promise<{
    productId?: string;
    q?: string;
    status?: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ResearchRoute({ searchParams }: ResearchPageProps) {
  const sp = await searchParams;
  const productId = sp?.productId || 'academic';
  const searchQuery = sp?.q || '';
  const filterStatus = sp?.status || 'all';
  const binding = readProductBinding(productId);
  
  return <ResearchPage 
    productId={productId} 
    binding={binding}
    searchQuery={searchQuery}
    filterStatus={filterStatus}
  />;
}