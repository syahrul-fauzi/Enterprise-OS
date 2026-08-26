/**
 * WorkRealityExperience Type Contracts
 * Core data model untuk Work Reality Surface yang dapat digunakan oleh SEMUA domain
 * One Work → Many Perspectives (sesuai thesis EOS)
 */

export interface WorkIdentity {
  title: string;
  description: string;
  workId: string;
  status: string;
}

export interface WorkState {
  currentState: string;
  nextAction: string;
  blockers: string[];
}

export interface WorkParticipant {
  id: string;
  role: 'customer' | 'professional' | 'operator' | 'agent' | 'notary';
  name: string;
}

export interface CommunicationEvent {
  id: string;
  channel: string;
  actorId: string;
  sender: 'customer' | 'professional' | 'operator' | 'agent' | 'notary';
  recipients: Array<'customer' | 'professional' | 'operator' | 'agent' | 'notary'>;
  content: string;
  timestamp: number;
}

export interface WorkInspection {
  label: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export interface WorkCoordinationAction {
  actor: string;
  action: string;
  description: string;
}

export interface EvidenceArtifact {
  label: string;
  url: string;
  source: string;
}

/**
 * Core WorkRealityModel — Satu data model untuk SEMUA perspektif
 * Bukan 3 sistem berbeda untuk customer/lawyer/operator. Satu model, banyak view.
 */
export interface WorkRealityModel {
  identity: WorkIdentity;
  state: WorkState;
  participants: WorkParticipant[];
  communications: CommunicationEvent[];
  inspections: WorkInspection[];
  coordination: WorkCoordinationAction[];
  evidence: EvidenceArtifact[];
}

/**
 * Perspective type — hanya mengatur apa yang ditampilkan, bukan mengubah data model
 * "One Work, Every Perspective" sesuai thesis EOS
 */
export type WorkRealityPerspective = 'customer' | 'professional' | 'operator' | 'agent' | 'notary';

/**
 * Canonical WORK_PERSPECTIVES - shared primitive across all products (Rule of Two proven)
 * Single source of truth untuk semua perspective definitions, digunakan oleh WorkRealitySurface, CaseDetailPage, dan semua komponen yang membutuhkan
 */
export const WORK_PERSPECTIVES: Record<WorkRealityPerspective, {
  label: string;
  description: string;
  question: string;
}> = {
  customer: {
    label: "Klien",
    description: "Anda melihat pekerjaan sebagai Klien",
    question: "Di mana posisi pekerjaan saya?"
  },
  professional: {
    label: "Profesional",
    description: "Anda melihat pekerjaan sebagai Profesional Layanan",
    question: "Apa langkah selanjutnya yang harus saya lakukan?"
  },
  operator: {
    label: "Operator",
    description: "Anda melihat pekerjaan sebagai Platform Operator",
    question: "Apa yang terblokir dan membutuhkan intervensi?"
  },
  agent: {
    label: "Agent",
    description: "Anda melihat pekerjaan sebagai Sistem Agent",
    question: "Tugas apa yang harus saya eksekusi berikutnya?"
  },
  notary: {
    label: "Notaris",
    description: "Anda melihat pekerjaan sebagai Notaris Publik",
    question: "Dokumen mana yang perlu saya verifikasi dan tanda tangani?"
  }
};