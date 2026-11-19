export enum AutonomyLevel {
  A0 = 'A0',
  A1 = 'A1',
  A2 = 'A2',
  A3 = 'A3',
  A4 = 'A4',
}

export interface Seat {
  id: string;
  humanOwnerId: string;
  authorityScope: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  seatName?: string;
  seatDescription?: string;
}

export interface Companion {
  id: string;
  seatId: string;
  type: 'DOT' | 'AGENT' | 'SPECIALIST';
  autonomyLevel: AutonomyLevel;
  scopedPermissions: string[];
  validFrom: string;
  validUntil?: string;
  status: 'ACTIVE' | 'REVOKED' | 'PAUSED';
  companionName?: string;
  companionDescription?: string;
}

export interface ActorAttribution {
  id: string;
  operation: string;
  timestamp: string;
  initiatedBy: { type: 'HUMAN' | 'AGENT' | 'DOT'; id: string };
  delegatedBy?: { type: 'HUMAN' | 'AGENT' | 'DOT'; id: string };
  executedBy: { type: 'HUMAN' | 'AGENT' | 'DOT'; id: string };
  approvedBy?: { type: 'HUMAN' | 'AGENT' | 'DOT'; id: string };
  evidenceRefs: string[];
}

export interface SeatCompanionFabric {
  seats: Seat[];
  companions: Companion[];
  actorAttributions: ActorAttribution[];
}