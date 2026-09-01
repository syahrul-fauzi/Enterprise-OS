"use client";

import React from 'react';
import { useWorkRealityController } from './WorkRealityController';
import { WorkRealitySurface } from './WorkRealitySurface';
import type { WorkRealityModel, WorkRealityPerspective } from "@repo/presentation-entities";

interface WorkRealityExperienceProps {
  readonly initialModel: WorkRealityModel;
  readonly perspective?: WorkRealityPerspective;
}

/**
 * WorkRealityExperience — EOS Work Reality Core Experience
 * COMPOSITION ONLY: Menggunakan WorkRealityController untuk state/runtime + WorkRealitySurface untuk rendering
 * Mengikuti MyReality golden pattern: Experience = composition only
 * NO client-side reality reconstruction, NO domain logic — pure composition
 */
export function WorkRealityExperience({
  initialModel,
  perspective = 'operator',
}: WorkRealityExperienceProps) {
  // Controller owns ALL runtime interaction + client state
  const {
    model,
    currentPerspective,
    isConnected,
    switchPerspective,
    dispatchAction,
    refreshModel,
  } = useWorkRealityController({ initialModel, perspective });

  // Experience is PURE COMPOSITION: only orchestrates components, no logic
  return (
    <WorkRealitySurface
          model={model}
          currentPerspective={currentPerspective}
          onSwitchPerspective={switchPerspective}
          onAssignLawyer={(formData) => dispatchAction('assignLawyer', formData)}
          onAddEvidence={(formData) => dispatchAction('addEvidence', formData)}
          onMarkCompleted={(formData) => dispatchAction('markCompleted', formData)}
          onExecuteAction={(actionId) => dispatchAction(actionId)}
          onSendMessage={(content) => dispatchAction('send-message', content)}
          onAddParticipant={(name, role) => dispatchAction('addParticipant', { name, role })}
        />
  );
}