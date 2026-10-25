// Autonomy Boundary Check Types - Canonical implementation moved from consultation capability
// Gate A requirement: work-core is the single semantic authority for boundary validation
export interface AutonomyBoundaryCheck {
  action: string;
  allowed: string[];
  prohibited: string[];
}

export interface DecisionLogEntry {
  decision: string;
  by: string;
  at: Date;
  reason: string;
  controlIds: string[];
}

export interface ConsultationStageEvidence {
  stage: string;
  recordedAt: Date;
  recordedBy: string;
  summary: string;
  details: Record<string, unknown>;
  controlIds: string[];
}

export interface AutonomyBoundaryResult {
  ok: boolean;
  violationFound: boolean;
  log: DecisionLogEntry;
  stage: ConsultationStageEvidence;
  controlsApplied: string[];
}