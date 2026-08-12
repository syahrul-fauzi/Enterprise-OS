import { ProductDeliveryPage } from '@repo/presentation-widgets';

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProductDeliveryRouteProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProductDeliveryRoute({ params }: ProductDeliveryRouteProps) {
  const { productId } = await params;
  return <ProductDeliveryPage productId={productId} />;
}