"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell.js";
import { DeliveryWorkspace } from "../delivery-workspace/DeliveryWorkspace.js";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface ProductDeliveryPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
}

export function ProductDeliveryPage({ productId, binding }: ProductDeliveryPageProps) {
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="delivery" />
      <DeliveryWorkspace productId={productId} />
    </>
  );
}