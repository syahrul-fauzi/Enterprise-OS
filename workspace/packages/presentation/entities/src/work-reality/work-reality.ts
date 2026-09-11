// ============================================================
// Combined Entities Layer — All Presentation Types merged (formerly presentation-types package)
// Konsolidasi perintah inventory: pindahkan semua type dari presentation-types ke entities
// ============================================================

/**
 * Product Experience Canonical Contracts (formerly in @repo/presentation-types)
 * Kontrak standar untuk semua produk yang menggunakan presentation engine
 */
export interface ProductIdentity {
  readonly productId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
}

export interface ProductAudience {
  readonly primary: string;
  readonly secondary?: readonly string[];
  readonly description: string;
}

export interface ProductPositioning {
  readonly valueTitle: string;
  readonly valueDescription: string;
}

export interface ProductNavigation {
  readonly primaryCta: {
    readonly label: string;
    readonly href: string;
  };
  readonly secondaryCta: {
    readonly label: string;
    readonly href: string;
  };
  readonly tertiaryCta?: {
    readonly label: string;
    readonly href: string;
  };
}

export interface ProductNarrative {
  readonly summary: string;
  readonly journey: readonly string[];
}

export interface ProductTrustSignal {
  readonly title: string;
  readonly description: string;
  readonly bullets: readonly string[];
}

export interface ProductJourneyStep {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface ProductTheme {
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly brandName?: string;
}

export interface ProductEntry {
  readonly primaryIntent: string;
  readonly primaryActionLabel: string;
  readonly discoveryMode: 'search' | 'role' | 'topic' | 'community';
  readonly audienceChoices?: readonly { label: string; value: string; description: string }[];
  readonly searchPlaceholder?: string;
  readonly categories?: readonly string[];
  readonly topics?: readonly { id: string; label: string; description: string }[];
}

export interface ProductExperience {
  readonly identity: ProductIdentity;
  readonly audience: ProductAudience;
  readonly positioning: ProductPositioning;
  readonly narrative: ProductNarrative;
  readonly navigation: ProductNavigation;
  readonly trustSignals: ProductTrustSignal;
  readonly journeys: readonly ProductJourneyStep[];
  readonly theme: ProductTheme;
  readonly entry: ProductEntry;
  readonly workflow: {
    readonly requirementTitle: string;
    readonly requirementSummary: string;
    readonly requirements?: readonly string[];
    readonly createHelper: string;
    readonly updateHelper: string;
    readonly createLabel: string;
    readonly updateLabel: string;
    readonly primaryCta?: { label: string; href: string };
  };
}

/**
 * WorkRealityExperience Type Contracts
 * Core data model untuk Work Reality Surface yang dapat digunakan oleh SEMUA domain
 * One Work → Many Perspectives (sesuai thesis EOS)
 */
// ============================================================
// Formalized Sub-View Contracts with Canonical Source Tracking
// Setiap view contract memiliki referensi jelas ke sumber canonical level 1
// ============================================================
/**
 * Canonical Source: WorkAggregate.identity (Level 1 Canonical Reality)
 * Presentation View Contract: WorkIdentityView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan data identity untuk konsumsi UI
 */
export interface WorkIdentityView {
  title: string;
  description: string;
  workId: string;
  status: string;
  linkedIntentId?: string;
  specialization?: string;
  workspaceId?: string;
}

/**
 * Canonical Source: WorkAggregate.state (Level 1 Canonical Reality)
 * Presentation View Contract: WorkStateView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan state workflow untuk UI yang konsisten
 */
export interface WorkStateView {
  currentState: string;
  nextAction: string;
  blockers: string[];
}

/**
 * Canonical Source: WorkAggregate.participants[] (Level 1 Canonical Reality)
 * Presentation View Contract: WorkParticipantView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan data partisipan untuk komponen avatar/profil
 */
export interface WorkParticipantView {
  id: string;
  role: 'customer' | 'professional' | 'operator' | 'agent' | 'notary';
  name: string;
}

/**
 * Canonical Source: WorkAggregate.communicationLog[] (Level 1 Canonical Reality)
 * Presentation View Contract: CommunicationEventView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan event komunikasi untuk timeline chat UI
 */
export interface CommunicationEventView {
  id: string;
  channel: string;
  actorId: string;
  sender: 'customer' | 'professional' | 'operator' | 'agent' | 'notary';
  recipients: Array<'customer' | 'professional' | 'operator' | 'agent' | 'notary'>;
  content: string;
  timestamp: number;
}

/**
 * Canonical Source: WorkAggregate.inspections[] (Level 1 Canonical Reality)
 * Presentation View Contract: WorkInspectionView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan hasil inspeksi untuk status banner UI
 */
export interface WorkInspectionView {
  label: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

/**
 * Canonical Source: WorkAggregate.coordinationActions[] (Level 1 Canonical Reality)
 * Presentation View Contract: WorkCoordinationActionView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan aksi koordinasi untuk action item UI
 */
export interface WorkCoordinationActionView {
  actor: string;
  action: string;
  description: string;
}

/**
 * Canonical Source: EvidenceRecord[] (Level 1 Canonical Reality)
 * Presentation View Contract: EvidenceArtifactView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan artefak bukti untuk file gallery UI
 */
export interface EvidenceArtifactView {
  label: string;
  url: string;
  source: string;
}

/**
 * Canonical Source: WorkAggregate.activityLog[] (Level 1 Canonical Reality)
 * Presentation View Contract: ActivityEntryView (Level 2 Presentation Entity)
 * Level 2 view yang menormalkan log aktivitas untuk activity feed UI
 */
export interface ActivityEntryView {
  id: string;
  type: 'created' | 'assigned' | 'evidence' | 'status' | 'communication' | 'completed' | 'note' | 'external';
  actor: string;
  actorRole?: 'customer' | 'professional' | 'operator' | 'agent' | 'notary';
  title: string;
  description?: string;
  timestamp: string | number;
  metadata?: Record<string, unknown>;
}

// Backward compatibility aliases — maintain existing imports
export type WorkIdentity = WorkIdentityView;
export type WorkState = WorkStateView;
export type WorkParticipant = WorkParticipantView;
export type CommunicationEvent = CommunicationEventView;
export type WorkInspection = WorkInspectionView;
export type WorkCoordinationAction = WorkCoordinationActionView;
export type EvidenceArtifact = EvidenceArtifactView;
export type ActivityEntry = ActivityEntryView;

/**
 * Community & Publication Types (formerly in @repo/presentation-types)
 * Untuk directory komunitas dan daftar publikasi/penelitian
 */
export interface Member {
  id: string;
  name: string;
  affiliation: string;
  type: string;
  location: string;
  publicationCount?: number;
  researcherCount?: number;
  researchFocus?: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  summary?: string;
  owner?: string;
  updatedAt?: string | number;
  status: 'open' | 'in-progress' | 'completed' | 'published' | 'peer-review' | 'verified' | 'implemented';
  tags: string[];
}

/**
 * Presentation Routes Type (formerly in @repo/presentation-types)
 * Route definitions for capability experiences
 */
export interface PresentationRoutes {
  readonly default?: string;
  readonly paths?: Readonly<Record<string, string>>;
}

/**
 * @deprecated Renamed to PresentationRoutes — backward compatibility alias.
 * Maintained for existing capability route imports.
 */
export type CapabilityExperienceRoutes = PresentationRoutes;

/**
 * Core WorkRealityModel — Satu data model untuk SEMUA perspektif
 * Bukan 3 sistem berbeda untuk customer/lawyer/operator. Satu model, banyak view.
 */
/**
 * Core WorkRealityModel — SEBAGAI COMPOSITION ROOT (bukan God entity)
 * Mengaggregate SEMUA sub-view contracts menjadi satu stable model untuk surface
 * Canonical Source: Semua Level 1 entities yang di-proyeksikan ke sub-view di atas
 * Bisa digunakan oleh SEMUA platform (Web/API/Mobile/MCP) tanpa modifikasi
 */
export interface WorkRealityModel {
  identity: WorkIdentityView;
  state: WorkStateView;
  participants: WorkParticipantView[];
  communications: CommunicationEventView[];
  inspections: WorkInspectionView[];
  coordination: WorkCoordinationActionView[];
  evidence: EvidenceArtifactView[];
  activity: ActivityEntryView[];
  actor?: {
    id: string;
    role: WorkParticipantView['role'];
  };
}

/**
 * R9 - MY REALITY MODEL: Canonical presentation contract untuk My Reality experience
 * Satu model untuk semua platform (GitHub, Zendesk, Shopee, internal) masuk ke presentation layer
 * Memenuhi R8-HR invariants: identity consistency, external reality, priority sorting, continuation
 */
export interface PlatformReference {
  id: string;
  source: "github-platform" | "zendesk-support" | "shopee-marketplace" | "legal-case" | "internal";
  name: string;
  label: string;
  bgColor: string;
  textColor: string;
}

export interface CompanionInsight {
  id: string;
  workId: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  actionLabel: string;
}

export interface RealityWorkItem {
  workId: string;
  id: string;
  title: string;
  description?: string;
  state: "open" | "in_progress" | "blocked" | "completed";
  priority: "now" | "next" | "watching";
  platform?: PlatformReference;
  bottleneck?: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    label: string;
    description?: string;
  };
  nextAction?: {
    label: string;
    actionId: string;
    description?: string;
  };
  href: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformDistribution {
  platform: string;
  count: number;
}

export interface MyRealityModel {
  actor: {
    id: string;
    displayName: string;
  };
  summary: {
    totalWork: number;
    inProgress: number;
    bottlenecked: number;
    completed: number;
    // Fase 1: AI Agent metrics untuk realtime dashboard
    aiProcessing?: number;
    aiCompleted?: number;
    aiFailed?: number;
    aiTotal?: number;
  };
  priority: {
    now: RealityWorkItem[];
    next: RealityWorkItem[];
    watching: RealityWorkItem[];
  };
  companion: {
    active: boolean;
    summary: string;
    insights: CompanionInsight[];
  };
  activity: ActivityEntry[];
  platformDistribution: PlatformDistribution[];
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