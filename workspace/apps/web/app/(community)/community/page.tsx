"use server";

import { CommunityPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';

interface CommunityPageProps {
  searchParams?: Promise<{
    productId?: string;
    q?: string;
    type?: string;
    location?: string;
  }>;
}

export default async function CommunityRoute({ searchParams }: CommunityPageProps) {
  const sp = await searchParams;
  const productId = sp?.productId || 'ilc';
  const searchQuery = sp?.q || '';
  const filterType = sp?.type || 'all';
  const filterLocation = sp?.location || 'all';
  const binding = readProductBinding(productId);
  
  return <CommunityPage 
    productId={productId}
    binding={binding}
    searchQuery={searchQuery}
    filterType={filterType}
    filterLocation={filterLocation}
  />;
}