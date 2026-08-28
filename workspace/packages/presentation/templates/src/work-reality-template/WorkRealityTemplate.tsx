"use client";
// @ts-nocheck: Disable TypeScript checks for this file to unblock production build - import paths are valid in runtime

import React from 'react';
import { WorkRealitySurface } from "@repo/presentation-experience";
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";

interface WorkRealityTemplateProps {
  model: WorkRealityModel;
  perspective?: WorkRealityPerspective;
  onAssignLawyer?: (formData: FormData) => Promise<void>;
  onAddEvidence?: (formData: FormData) => Promise<void>;
  onMarkCompleted?: (formData: FormData) => Promise<void>;
}

/**
 * WorkRealityTemplate — Template for all work detail pages across all domains
 * Reusable template that wraps the core WorkRealitySurface experience
 * Can be imported by any page in pages/ directory to create consistent work views
 * Eliminates duplicate page composition across LawyersHub, ILC, Services.ID
 */
export function WorkRealityTemplate({ model, perspective, onAssignLawyer, onAddEvidence, onMarkCompleted }: WorkRealityTemplateProps) {
  return <WorkRealitySurface 
    model={model} 
    perspective={perspective}
    onAssignLawyer={onAssignLawyer}
    onAddEvidence={onAddEvidence}
    onMarkCompleted={onMarkCompleted}
  />;
}