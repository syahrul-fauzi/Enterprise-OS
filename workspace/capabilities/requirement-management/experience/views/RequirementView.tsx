"use client";

import React from "react";
import {
  RequirementWorkspace,
  type RequirementCardCopy,
  type RequirementWorkspaceCopy,
} from "../workspaces/RequirementWorkspace.js";

export interface RequirementViewProps {
  readonly productId?: string;
  readonly copy?: RequirementWorkspaceCopy;
  readonly cardCopy?: RequirementCardCopy;
}

export function RequirementView({
  productId,
  copy,
  cardCopy,
}: RequirementViewProps) {
  return <RequirementWorkspace cardCopy={cardCopy} copy={copy} productId={productId} />;
}

export default RequirementView;
