"use client";

import React from 'react';
import { useWorkRealityController, WorkRealitySurface } from "@repo/presentation-experience";
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";

interface WorkRealityTemplateProps {
  initialModel: WorkRealityModel;
  perspective?: WorkRealityPerspective;
}

/**
 * WorkRealityTemplate — Template for all work detail pages across all domains
 * Reusable template that wraps the core WorkRealitySurface experience
 * Can be imported by any page in pages/ directory to create consistent work views
 * Eliminates duplicate page composition across LawyersHub, ILC, Services.ID
 * Follows MyReality golden pattern: Template initializes Controller → which drives Surface
 * NO domain logic, NO runtime interpretation - pure composition + controller delegation
 */
export function WorkRealityTemplate({ initialModel, perspective }: WorkRealityTemplateProps) {
  // Initialize controller with canonical initial model from server
  const {
    model,
    currentPerspective,
    switchPerspective,
    dispatchAction,
    isConnected,
    refreshModel
  } = useWorkRealityController({
    initialModel,
    perspective: perspective || 'operator'
  });

  // Map controller's generic dispatchAction to surface-specific handlers
  const handleSwitchPerspective = switchPerspective;
  const handleAssignLawyer = async (formData: FormData) => dispatchAction('assignLawyer', formData);
  const handleAddEvidence = async (formData: FormData) => dispatchAction('addEvidence', formData);
  const handleMarkCompleted = async (formData: FormData) => dispatchAction('markCompleted', formData);
  const handleExecuteAction = async () => dispatchAction('execute-action');
  const handleSendMessage = async (content: string) => dispatchAction('send-message', content);
  const handleAddParticipant = async (name: string, role: any) => dispatchAction('addParticipant', { name, role });

  // Debug log to verify template receives model and renders surface
  console.log('[WorkRealityTemplate] Rendering with model identity:', model.identity, 'realtime connected:', isConnected);
  
  return <WorkRealitySurface 
    model={model} 
    currentPerspective={currentPerspective}
    onSwitchPerspective={handleSwitchPerspective}
    onAssignLawyer={handleAssignLawyer}
    onAddEvidence={handleAddEvidence}
    onMarkCompleted={handleMarkCompleted}
    onExecuteAction={handleExecuteAction}
    onSendMessage={handleSendMessage}
    onAddParticipant={handleAddParticipant}
  />;
}