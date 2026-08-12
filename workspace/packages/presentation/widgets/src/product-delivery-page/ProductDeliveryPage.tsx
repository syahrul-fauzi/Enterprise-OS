"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { DeliveryWorkspace } from "../delivery-workspace/DeliveryWorkspace";
import { readProductBinding, getProductExperience, readProductRouteMetadata } from "@repo/presentation-experience";
import type { Metadata } from "next";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface ProductDeliveryPageProps {
  readonly productId: string;
}

export async function generateMetadata(
  input: ProductDeliveryPageProps,
): Promise<Metadata> {
  const binding = readProductBinding(input.productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "delivery",
  );
}

export async function ProductDeliveryPage({ productId }: ProductDeliveryPageProps) {
  const binding: ProductPreviewBinding = readProductBinding(productId);
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="delivery" />
      <DeliveryWorkspace productId={productId} />
    </>
  );
}