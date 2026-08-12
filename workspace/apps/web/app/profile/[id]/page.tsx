"use server";

import { ProfilePage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    productId?: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProfileRoute({ params, searchParams }: ProfilePageProps) {
  const { id: profileId } = await params;
  const sp = await searchParams;
  const productId = sp?.productId || 'academic';
  const binding = readProductBinding(productId);
  return <ProfilePage profileId={profileId} productId={productId} binding={binding} />;
}