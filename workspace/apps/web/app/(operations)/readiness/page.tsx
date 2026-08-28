"use client";

import React, { useState, useEffect } from "react";
// import ReleaseReadinessWorkspace from "@capabilities/requirement-management/experience/workspaces/ReleaseReadinessWorkspace";
// import ReleaseReadinessChat from "@capabilities/requirement-management/experience/workspaces/ReleaseReadinessChat";

type Surface = "workspace" | "chat" | "split";

export default function ReleaseReadinessPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly surface?: string;
    readonly releaseId?: string;
  }>;
}) {
  const [surface, setSurface] = useState<Surface>("split");
  const [initialReleaseId, setInitialReleaseId] = useState<string>("EOS-003");
  // Placeholder while requirement-management capability is restored
  return <div className="p-8 max-w-7xl mx-auto"><h1 className="text-2xl font-bold mb-4">Release Readiness</h1><p className="text-gray-600">This feature is temporarily unavailable - coming soon in a future wave.</p></div>;
}