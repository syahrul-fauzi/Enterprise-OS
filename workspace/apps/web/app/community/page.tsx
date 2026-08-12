import { CommunityPage } from '@repo/presentation-widgets';

interface CommunityPageProps {
  searchParams?: Promise<{
    productId?: string;
    q?: string;
    type?: string;
    location?: string;
  }>;
}

export default async function CommunityRoute({ searchParams }: CommunityPageProps) {
  return <CommunityPage rawSearchParams={searchParams} />;
}