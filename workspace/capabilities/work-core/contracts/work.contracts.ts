import { z } from "zod";
// Import type definitions untuk digunakan di WorkAggregate interface (HANYA TYPE, tidak ada value)
// Ini dipisahkan dari import value untuk menghindari conflict nama di IDE cache
import type {
  WorkId,
  TenantId,
  WorkspaceId,
  ActorId,
  SessionId,
  UserId,
  UserAggregate,
  MembershipRepository,
  SessionRepository,
  IntentCategory,
  IntentRawInput
} from "../../identity/implementation/index.ts";

// Import value/factory functions DENGAN ALIAS UNIK agar tidak konflik dengan type names
// Setiap factory function diberi prefix 'create' untuk membedakan antara type (misal WorkId) dan value (createWorkId)
import {
  WorkId as createWorkId,
  TenantId as createTenantId,
  WorkspaceId as createWorkspaceId,
  ActorId as createActorId,
  SessionId as createSessionId,
  UserId as createUserId,
  newWorkId,
  getMembershipRepositoryPostgres,
  getSessionRepositoryPostgres
} from "../../identity/implementation/index.ts";

// Re-export SEMUA type untuk dipakai oleh capability lain
export type {
  WorkId,
  TenantId,
  WorkspaceId,
  ActorId,
  SessionId,
  UserId,
  UserAggregate,
  MembershipRepository,
  SessionRepository,
  IntentCategory,
  IntentRawInput
};

// Re-export SEMUA value/factory functions dengan nama yang jelas (tidak sama dengan type)
// Ini menghindari duplicate identifier di IDE dan CLI sekaligus
export {
  createWorkId,
  createTenantId,
  createWorkspaceId,
  createActorId,
  createSessionId,
  createUserId,
  newWorkId,
  getMembershipRepositoryPostgres,
  getSessionRepositoryPostgres
};

// ==============================================
// ONLY LOCAL TYPES UNIQUE TO WORK-CORE (tidak ada di identity)
// Semua type di bawah ini adalah type baru yang didefinisikan khusus di work-core
// ==============================================
// Use z.BRAND compatible type definition to match atomic-composition contracts
// CompositionId adalah identifier unik untuk work-core (tidak ada di @repo/capabilities-identity)
export type CompositionId = string & { __brand: "CompositionId" };
export function CompositionId(value: string): CompositionId { return value as CompositionId; }

export const WorkStatusEnum = ["draft", "active", "executing", "suspended", "completed", "cancelled", "observed", "explored", "evaluated", "authorized", "procured", "settled", "SUBMITTED", "APPROVED"] as const;
export type WorkStatus = typeof WorkStatusEnum[number];
export const WorkModeEnum = ["core", "domain", "federation", "oneshot"] as const;
export type WorkMode = typeof WorkModeEnum[number];
export const ExecutionFrameEnum = ["direct", "proxy", "mcp", "constrained-gui"] as const;
export type ExecutionFrame = typeof ExecutionFrameEnum[number];
export const ClaimStatusEnum = ["UNCLAIMED", "CLAIMED", "STALE", "RECLAIMED"] as const;
export type ClaimStatus = typeof ClaimStatusEnum[number];

// ==============================================
// 🎯 CONTINUITY OBJECT (IRREDUCIBLE FUNDAMENTAL PRIMITIVE)
// Definisi: "A Continuity Object is a bounded semantic commitment whose identity persists 
// while its state, executor, representation, and execution substrate may change."
// Unit terkecil yang membuat Work Continuity mungkin - primitive terdasar EOS
// ==============================================
export interface SemanticState {
  version: number;               // Version dari semantic state untuk concurrency control
  current_state: string;         // Deskripsi state saat ini dalam bentuk terstandardisasi
  target_state: string;          // Deskripsi state target yang ingin dicapai
  constraints: readonly string[]; // Aturan/hukum yang tidak boleh dilanggar selama transisi
  authority: readonly string[];   // Daftar actor yang diizinkan untuk memodifikasi object ini
  capabilities: readonly string[]; // Daftar capability yang diizinkan untuk dieksekusi
  dependencies: readonly string[]; // Daftar object lain yang menjadi dependensi
  observations: readonly string[]; // Pengamatan terverifikasi tentang object ini
  decisions: readonly string[];   // Keputusan terverifikasi yang pernah diambil
  evidence: readonly string[];    // Bukti untuk setiap transisi yang telah dilakukan
  provenance: readonly string[];  // Riwayat causal chain dari semua perubahan
}

export interface ContinuityObject {
  identity: string;               // Immutable unique identifier (never changes - W-CONST-001)
  initial_condition: SemanticState; // Starting state saat ContinuityObject dibuat
  intended_condition: SemanticState; // Target state yang ingin dicapai
  transitions: readonly SemanticState[]; // Riwayat semua perubahan state yang pernah terjadi
}

// ==============================================
// WORK CONTINUITY CONTRACT (CONSTITUTIONAL PROJECTION)
// Work adalah human-operational projection dari ContinuityObject
// Dibagi menjadi 3 lapisan sesuai tesis BETTER EOS: SEMANTIC → CONTROL → EVIDENCE
// Invariant utama: Execution may change; Work semantics may not be silently redefined by execution.
// ==============================================

// ==============================================
// 📌 SEMANTIC CONTRACT (meaning preservation)
// Menjawab: "Work ini apa, milik siapa, dan siapa yang bertindak?"
// SELALU STABLE, tidak dapat diubah oleh execution substrate
// ==============================================
export interface WorkSemanticContract extends ContinuityObject {
  id: WorkId;                     // Identity Continuity: Unique immutable Work ID (extends ContinuityObject.identity)
  compositionId: CompositionId;   // Composition identity: Work's parent composition boundary
  tenantId: TenantId;             // Authority Continuity: Tenant ownership boundary (TENANT-ISOLATION-001)
  workspaceId: WorkspaceId;       // Authority Continuity: Workspace ownership boundary
  actorId: ActorId;               // Attribution Continuity: Responsible actor for current action
  executionFrame?: ExecutionFrame; // Boundary Continuity: CMBCD execution boundary mechanism (Direct/Proxy/MCP/Constrained-GUI)
  title: string;                  // Semantic identity: Human-readable Work identity
  description?: string;           // Semantic context: Additional Work context
  platformMetadata?: Record<string, any>; // Context extension: Substrate-specific metadata (tidak mengubah makna)
}

// ==============================================
// 🎛️ CONTINUITY CONTROL CONTRACT (execution safety)
// Menjawab: "Bagaimana Work boleh bergerak atau dieksekusi tanpa kehilangan semantic integrity?"
// Mengatur lifecycle, claim, lease, dan execution binding
// ==============================================
export interface WorkControlContract {
  status: WorkStatus;             // Lifecycle state: Current state in Work lifecycle
  mode: WorkMode;                 // Execution scope: Allowed execution boundaries
  sessionId: SessionId;           // Execution binding: Current active execution session
  claimStatus?: ClaimStatus;      // Concurrency control: Exclusive execution claim state
  leaseUntil?: Date;              // Lease management: Claim expiration timestamp for crash recovery
  activeExecutionId?: SessionId;  // Execution tracking: Currently active execution ID
  previousExecutionIds?: SessionId[]; // Execution lineage: History of execution sessions (E6 continuity)
  createdAt: Readonly<Date>;      // Temporal continuity: Immutable creation timestamp
  updatedAt: Readonly<Date>;      // Temporal continuity: Immutable last update timestamp
  // Backward compatibility fields (legacy mapping only)
  workId?: string;                // Backward compatibility: Repository mapping only
  domainType?: string;            // Backward compatibility: Legacy domain typing
  version?: number;               // Backward compatibility: Version tracking
  participants?: string[];        // Backward compatibility: Participant list
  linkedExpressionId?: string;    // Backward compatibility: Expression binding
}

// ==============================================
// 📝 EVIDENCE CONTRACT (auditability & proof)
// Menjawab: "Bagaimana kita membuktikan apa yang terjadi?"
// Menjaga disiplin evidence→claim, semua perubahan tercatat sebagai bukti
// ==============================================
export interface WorkEvidenceContract {
  stateHistory?: unknown[];       // State evidence: Complete history of Work state transitions
  evidence?: unknown[];           // Execution evidence: Chain of proof for every execution
  externalId?: string;            // Substrate mapping: External ID from origin platform
  platformSource?: string;        // Attribution evidence: Origin platform of last execution
}

// ==============================================
// WORK AGGREGATE (Backward Compatibility)
// Union dari ketiga contract untuk mendukung codebase yang sudah ada
// Semua capability baru harus menggunakan interface terpisah untuk mempertahankan disiplin lapisan
// ==============================================
export interface WorkAggregate extends WorkSemanticContract, WorkControlContract, WorkEvidenceContract {}