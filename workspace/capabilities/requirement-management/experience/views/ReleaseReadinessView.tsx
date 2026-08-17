"use client";

import React from "react";
import { ReleaseReadinessWorkspace } from "../workspaces/ReleaseReadinessWorkspace.js";

export interface ReleaseReadinessViewProps {
  readonly defaultReleaseId?: string;
}

export function ReleaseReadinessView({
  defaultReleaseId = "EOS-003",
}: ReleaseReadinessViewProps) {
  return <ReleaseReadinessWorkspace defaultReleaseId={defaultReleaseId} />;
}

export default ReleaseReadinessView;