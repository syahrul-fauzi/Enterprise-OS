import { z } from "zod";
// Import canonical identity types + factory functions dari @repo/contracts-core (single source of truth)
// Himpun semua import dalam satu blok untuk menghindari duplikasi dan error export
import { 
  createWorkId,
  newWorkId,
  type WorkId,
  type TenantId, 
  type ActorId, 
  type WorkspaceId,
  type SessionId,
  type UserId,
  type UserAggregate,
  type MembershipRepository,
  type SessionRepository,
  type IntentCategory,
  type IntentRawInput
} from "@repo/contracts-core";

// Import randomUUID untuk internal use jika diperlukan (harus di-import sebelum digunakan)
import { randomUUID } from "node:crypto";

// Export canonical WorkId type and factories for downstream use
// WorkId is exported as both type (for TypeScript) and value (runtime factory function from @repo/contracts-core)
export { 
  createWorkId,
  newWorkId
};
export type { WorkId, TenantId, ActorId, WorkspaceId, SessionId };

// Implementasi brand function sederhana untuk identity types (berfungsi di runtime dan type-time)
// Sama pattern dengan createWorkId dari @repo/contracts-core
function createBrand<T>(brand: string) {
  return (value: string) => value as unknown as T;
}

// Definisikan factory functions untuk semua identity types untuk konsistensi
function createTenantId(value: string): TenantId {
  return createBrand<TenantId>('TenantId')(value);
}

function createActorId(value: string): ActorId {
  return createBrand<ActorId>('ActorId')(value);
}

function createWorkspaceId(value: string): WorkspaceId {
  return createBrand<WorkspaceId>('WorkspaceId')(value);
}

function createSessionId(value: string): SessionId {
  return createBrand<SessionId>('SessionId')(value);
}

function newTenantId(): TenantId {
  return createTenantId(`tenant-${randomUUID()}`);
}

function newActorId(): ActorId {
  return createActorId(`actor-${randomUUID()}`);
}

function newWorkspaceId(): WorkspaceId {
  return createWorkspaceId(`workspace-${randomUUID()}`);
}

function newSessionId(): SessionId {
  return createSessionId(`session-${randomUUID()}`);
}

// Export SEMUA factory functions dan type SETELAH implementasi (hanya SEKALI untuk menghindari duplikasi)
export { 
  createTenantId, 
  createActorId, 
  createWorkspaceId, 
  createSessionId, 
  newTenantId, 
  newActorId, 
  newWorkspaceId, 
  newSessionId
};
// export type { TenantId, WorkspaceId, ActorId, SessionId, WorkStatus, WorkAggregate, ContinuityObject, IdentityBoundary, SemanticBoundary, AuthorityBoundary }; // Baris ini diduplikasi di blok export baris 105-117 - dikomentari untuk menghindari TS2484
// Export all types that were previously in the separate type export block to maintain all exports


// Import work-specific repositories dan base utilities untuk di-export ulang
import { getWorkRepositoryPostgres } from "../implementation/repository/work-postgres.repository.ts";
import { initIdentitySchema, SessionRepositoryInMemory } from "../../../capabilities/identity/implementation/repositories/index.ts";
import { PostgresRepository, getPool } from "../../../capabilities/identity/implementation/repositories/base.repository.ts";

// Re-export SEMUA value/factory functions dan base classes
export {
  getWorkRepositoryPostgres,
  initIdentitySchema,
  SessionRepositoryInMemory,
  PostgresRepository,
  getPool
};

// Re-export SEMUA type dan factory functions untuk dipakai oleh capability lain
export type {
  UserId,
  UserAggregate,
  MembershipRepository,
  SessionRepository,
  IntentCategory,
  IntentRawInput
};

// Dihapus: duplicate export createWorkId/newWorkId - sudah di-export sebelumnya di baris 26-28

// Export value/factory functions sudah dilakukan di atas - tidak perlu export ulang
// Ini menghindari duplicate identifier yang menyebabkan transform error

// ==============================================
// ONLY LOCAL TYPES UNIQUE TO WORK-CORE (tidak ada di identity)
// Semua type di bawah ini adalah type baru yang didefinisikan khusus di work-core
// ==============================================
// Use z.BRAND compatible type definition to match atomic-composition contracts
// CompositionId adalah identifier unik untuk work-core (tidak ada di @repo/capabilities-identity)
export type CompositionId = string & { __brand: "CompositionId" };
export function CompositionId(value: string): CompositionId { return value as CompositionId; }

export const WorkStatusEnum = ["draft", "active", "executing", "suspended", "completed", "cancelled", "observed", "explored", "evaluated", "authorized", "procured", "settled", "SUBMITTED", "APPROVED", "SIGNATURE_REQUIRED", "SIGNATURE_PENDING", "SIGNATURE_PARTIALLY_COMPLETED", "SIGNATURE_COMPLETE", "SIGNATURE_REJECTED", "SIGNATURE_EXPIRED"] as const;
export type WorkStatus = typeof WorkStatusEnum[number];
export const WorkModeEnum = ["core", "domain", "federation", "oneshot"] as const;
export type WorkMode = typeof WorkModeEnum[number];
export const ExecutionFrameEnum = ["direct", "proxy", "mcp", "constrained-gui"] as const;
export type ExecutionFrame = typeof ExecutionFrameEnum[number];
export const ClaimStatusEnum = ["UNCLAIMED", "CLAIMED", "STALE", "RECLAIMED"] as const;
export type ClaimStatus = typeof ClaimStatusEnum[number];

// CMBCD Core Types (Canonical Actor+Capability+Authority+Context+Risk+Evidence framework)
// Defined once in work-core to enforce single semantic source of truth across all vertical slices
export interface ActorMetadata {
  readonly actorId: ActorId;
  readonly actorType: "human" | "ai-agent" | "external-service" | "organization" | "machine";
  readonly role: string;
  readonly displayName: string;
  readonly trustLevel: "verified" | "certified" | "unverified";
}

export interface AuthorizationScope {
  readonly allowedActions: readonly string[];
  readonly restrictedFields: readonly string[];
}

export interface ContextMetadata {
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId | undefined;
  readonly jurisdiction: string;
  readonly requestCategory: string;
  readonly sensitivityLevel: "public" | "internal" | "confidential" | "restricted";
  readonly relatedWorkIds: readonly string[];
  // W-012: HIGH-VALUE WORK GRAPH CORE LINKS (sync dengan WorkSemanticContract)
  readonly relatedProductIds: readonly string[];
  readonly relatedRequirementIds: readonly string[];
}

export interface RiskAssessment {
  readonly level: "low" | "medium" | "high" | "critical";
  readonly rationale: string;
  readonly assessedBy: ActorId;
  readonly assessedAt: Date;
}

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
// 🎯 6 BOUNDARY CLASSES (EOS HIGH-VALUE WORK ARCHITECTURE)
// Definisi formal dari 6 boundary classes yang memisahkan concerns tanpa memaksa workspace sebagai boundary universal
// Identity → Semantic → Authority → Execution → Evidence → Presentation
// ==============================================
/**
 * ① Identity Boundary: Siapa yang memiliki/berwenang terhadap Work?
 * Mengelola kepemilikan dan identitas legal/operasional dari sebuah Work
 */
export interface IdentityBoundary {
  readonly tenantId: TenantId;
  readonly organizationId: string;
  readonly institutionId?: string;
  readonly principalId: ActorId; // Economic principal yang bertanggung jawab
  readonly ownerIds: readonly ActorId[]; // Actor yang memiliki hak kepemilikan
}

/**
 * ② Semantic Boundary: Apa arti Work ini?
 * Mendefinisikan domain, intent, state, dan constraint yang membuat Work memiliki makna kontekstual
 */
export interface SemanticBoundary {
  readonly domain: string; // Domain bisnis (legal, service, investment, product)
  readonly intent: string; // Tujuan utama Work dalam bahasa bisnis
  readonly currentState: WorkStatus; // State saat ini dari Work
  readonly requirements: readonly string[]; // Daftar requirement yang harus dipenuhi
  readonly constraints: readonly string[]; // Constraint bisnis/teknis yang tidak boleh dilanggar
  readonly decisions: readonly string[]; // Keputusan yang telah diambil sepanjang lifecycle Work
}

/**
 * ③ Authority Boundary: Siapa boleh melakukan apa?
 * Mengelola hak akses dan otorisasi untuk setiap actor yang berinteraksi dengan Work
 */
export interface AuthorityBoundary {
  readonly actorCapabilities: ReadonlyMap<ActorId, readonly string[]>; // Capability yang dimiliki setiap actor
  readonly policyEnforcements: readonly string[]; // Policy yang diterapkan pada Work ini
  readonly authorizations: ReadonlyMap<ActorId, readonly string[]>; // Action yang diizinkan untuk setiap actor
  readonly delegations: readonly { from: ActorId; to: ActorId; actions: readonly string[]; expiresAt: Date }[]; // Riwayat delegasi wewenang
}

/**
 * ④ Execution Boundary: Di mana pekerjaan dieksekusi?
 * Mendefinisikan runtime dan environment dimana Work dieksekusi
 */
export interface ExecutionBoundary {
  readonly workspaceId?: WorkspaceId; // Optional workspace (hanya salah satu execution context)
  readonly runtimeEnvironment: "web" | "agent" | "edge" | "external-system";
  readonly executorIds: readonly ActorId[]; // Actor yang bertanggung jawab mengeksekusi Work
  readonly deviceIds?: readonly string[]; // ID device yang terlibat (jika ada)
  readonly executionFrame: ExecutionFrame; // Cara eksekusi (direct/proxy/mcp/constrained-gui)
}

/**
 * ⑤ Evidence Boundary: Bukti apa yang terkumpul selama eksekusi Work?
 * Mendefinisikan chain of proof yang mencatat semua transisi dan interaksi selama lifecycle Work
 * Ini adalah boundary yang memisahkan state execution dari audit trail permanen
 */
export interface EvidenceBoundary {
  readonly evidenceIds: readonly string[]; // ID bukti yang tercatat di evidence-registry
  readonly evidenceChain: readonly {
    readonly actorId: ActorId;
    readonly action: string;
    readonly timestamp: Date;
    readonly workspaceId?: WorkspaceId;
    readonly deviceId?: string;
    readonly proofUrl?: string;
  }[]; // Rantai bukti kronologis semua interaksi
  readonly outcomeVerified: boolean; // Apakah outcome Work telah terverifikasi dengan bukti
  readonly lastVerifiedAt?: Date; // Waktu terakhir outcome diverifikasi
  readonly verifierIds?: readonly ActorId[]; // Actor yang memverifikasi outcome
}

/**
 * ⑥ Presentation Boundary: Siapa melihat Work dengan cara apa?
 * Mendefinisikan interface/surface yang digunakan untuk berinteraksi dengan Work (FACE PROJECTION)
 * Ini adalah boundary tempat FACE beroperasi - FACE HANYA projection dari data core Work
 */
export interface PresentationBoundary {
  readonly supportedFaces: readonly ("web" | "agent" | "api" | "mobile" | "mcp")[]; // Surface yang didukung
  readonly defaultLayout: string; // Layout default untuk human-facing surface
  readonly mobileEnabled: boolean; // Apakah mobile interface didukung
  readonly apiEnabled: boolean; // Apakah API surface didukung
  readonly projectionConfig: WorkProjectionConfig; // Konfigurasi khusus untuk projection FACE
}

/**
 * FACE Projection Configuration: Konfigurasi yang hanya digunakan oleh presentation layer
 * SEMUA data di sini DERIVED dari core Work data - TIDAK ADA source of truth di FACE
 * FACE HANYA menampilkan apa yang sudah ada di core, tidak pernah menyimpan state canonical
 */
export interface WorkProjectionConfig {
  readonly displayName: string; // Nama Work yang ditampilkan ke user (derived dari Work intent)
  readonly summary: string; // Ringkasan singkat untuk UI cards (derived dari Work requirements)
  readonly priority: "low" | "medium" | "high" | "critical"; // Prioritas yang ditampilkan di UI (derived dari risk assessment)
  readonly dueDate?: Date; // Tenggat waktu yang ditampilkan (derived dari core Work timeline)
  readonly uiFilters: readonly string[]; // Filter yang bisa diterapkan di UI untuk Work ini
  readonly hideFromSurfaces: readonly string[]; // Surface dimana Work ini tidak boleh ditampilkan
}

/**
 * Canonical FACE Projection: Object yang dikirim ke presentation layer untuk merender UI
 * SEMUA field di sini berasal dari core Work aggregates - TIDAK ADA data yang disimpan di FACE
 * Ini memastikan invariant: "FACE adalah projection, bukan owner" dari core Work data
 */
export interface WorkFaceProjection {
  readonly workId: WorkId; // Immutable ID Work - primary key yang tidak pernah berubah
  readonly identity: IdentityBoundary;
  readonly semantic: SemanticBoundary;
  readonly authority: AuthorityBoundary;
  readonly execution: ExecutionBoundary;
  readonly presentation: PresentationBoundary;
  readonly derivedState: {
    readonly canCurrentActorAct: boolean; // Dihitung server-side, bukan ditentukan client
    readonly nextAvailableActions: readonly string[]; // Action yang bisa diambil actor saat ini (server-derived)
    readonly evidenceCount: number; // Jumlah evidence yang terkumpul untuk Work ini
    readonly actorCount: number; // Jumlah actor yang terlibat dalam Work ini
  };
}

// ==============================================
// 🛡️ BOUNDARY VALIDATION FUNCTIONS (W-013: Enforce 5-boundary architecture)
// Memastikan semua boundary mematuhi mandate user: "Workspace bukan identitas. Workspace bukan authority."
// ==============================================

/**
 * Validasi IdentityBoundary sesuai EOS architecture:
 * - Identity boundary TIDAK BOLEH mengandung workspaceId (workspace hanyalah execution boundary)
 * - Semua field identitas utama (tenantId, organizationId, principalId) harus terisi
 * - Mematuhi mandate: "Workspace bukan identitas"
 */
export function validateIdentityBoundary(boundary: IdentityBoundary): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Mandatory identity fields check
  if (!boundary.tenantId) errors.push("IdentityBoundary missing required field: tenantId");
  if (!boundary.organizationId) errors.push("IdentityBoundary missing required field: organizationId");
  if (!boundary.principalId) errors.push("IdentityBoundary missing required field: principalId");
  
  // Prevent workspaceId from entering identity boundary (core mandate enforcement)
  if ('workspaceId' in boundary) {
    errors.push("IdentityBoundary cannot contain workspaceId - workspace is only an execution boundary (violates: 'Workspace bukan identitas')");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validasi AuthorityBoundary sesuai EOS architecture:
 * - Authority boundary TIDAK BOLEH menggunakan workspace sebagai sumber otoritas
 * - Semua otorisasi harus terikat pada actor, bukan workspace
 * - Mematuhi mandate: "Workspace bukan authority"
 */
export function validateAuthorityBoundary(boundary: AuthorityBoundary): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Prevent workspace from being an authority source (core mandate enforcement)
  if (boundary.actorCapabilities.has('workspace' as any as ActorId)) {
    errors.push("AuthorityBoundary cannot assign capabilities to workspace - only actors can have capabilities (violates: 'Workspace bukan authority')");
  }
  
  if (boundary.authorizations.has('workspace' as any as ActorId)) {
    errors.push("AuthorityBoundary cannot grant authorizations to workspace - only actors can receive authorizations (violates: 'Workspace bukan authority')");
  }
  
  // Validate delegations are only between actors
  boundary.delegations.forEach((delegation, index) => {
    if (delegation.from === 'workspace' as any as ActorId || delegation.to === 'workspace' as any as ActorId) {
      errors.push(`AuthorityBoundary delegation at index ${index} involves workspace - delegations can only be between actors`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validasi semua 6 boundary classes secara bersamaan untuk satu Work
 * Mengembalikan semua error yang ditemukan di semua boundary classes
 */
export function validateAllBoundaries(params: {
  identity: IdentityBoundary;
  semantic: SemanticBoundary;
  authority: AuthorityBoundary;
  execution: ExecutionBoundary;
  evidence: EvidenceBoundary;
  presentation: PresentationBoundary;
}): { valid: boolean; allErrors: string[] } {
  const identityValidation = validateIdentityBoundary(params.identity);
  const authorityValidation = validateAuthorityBoundary(params.authority);
  
  const allErrors = [
    ...identityValidation.errors,
    ...authorityValidation.errors
  ];
  
  // Additional semantic boundary checks
  if (!params.semantic.domain) allErrors.push("SemanticBoundary missing required field: domain");
  if (!params.semantic.intent) allErrors.push("SemanticBoundary missing required field: intent");
  
  // Additional execution boundary checks
  if (params.execution.workspaceId && !params.execution.runtimeEnvironment) {
    allErrors.push("ExecutionBoundary has workspaceId but missing runtimeEnvironment - workspace requires explicit runtime specification");
  }
  
  // Additional evidence boundary checks
  if (params.evidence.evidenceChain.length > 0 && params.evidence.evidenceIds.length !== params.evidence.evidenceChain.length) {
    allErrors.push("EvidenceBoundary mismatch: evidenceIds length must match evidenceChain length - every chain entry must have a registered evidence ID");
  }
  // Validate evidence chain entries have required fields
  params.evidence.evidenceChain.forEach((entry, index) => {
    if (!entry.actorId) allErrors.push(`EvidenceBoundary chain entry ${index} missing required field: actorId`);
    if (!entry.action) allErrors.push(`EvidenceBoundary chain entry ${index} missing required field: action`);
    if (!entry.timestamp) allErrors.push(`EvidenceBoundary chain entry ${index} missing required field: timestamp`);
  });
  
  return {
    valid: allErrors.length === 0,
    allErrors
  };
}

// ==============================================
// 📊 HIGH-VALUE WORK GRAPH (CORE ARCHITECTURE)
// Formalisasi grafik yang menghubungkan Product ↔ Requirement ↔ Work ↔ Outcome
// Mewujudkan mandate: "Yang kita bangun sebenarnya adalah High-Value Work Graph"
// ==============================================
/**
 * ProductNode: Node Product dalam High-Value Work Graph
 * Node level tertinggi dalam grafik yang merepresentasikan produk bisnis utama
 */
export interface ProductNode {
  readonly id: string; // ProductId (immutable unique identifier)
  readonly name: string; // Nama produk yang dapat dibaca manusia
  readonly description: string; // Deskripsi bisnis produk
  readonly ownerId: ActorId; // Actor yang bertanggung jawab atas produk
  readonly tenantId: string; // Tenancy boundary (identity boundary compliance)
  readonly linkedRequirementIds: readonly string[]; // Daftar requirement yang terhubung ke produk ini
  readonly linkedWorkIds: readonly WorkId[]; // Daftar Work yang mengekseskusi requirement produk ini
}

/**
 * RequirementNode: Node Requirement dalam High-Value Work Graph
 * Node yang menghubungkan Product dengan Work yang harus memenuhi requirement ini
 */
export interface RequirementNode {
  readonly id: string; // RequirementId (immutable unique identifier)
  readonly name: string; // Nama requirement (singkat, business-readable)
  readonly description: string; // Deskripsi detail requirement
  readonly status: string; // Status requirement (draft/active/completed) - sesuai migration 015
  readonly priority: string; // Prioritas requirement (low/medium/high/critical) - sesuai migration 015
  readonly ownerId: ActorId; // Actor yang bertanggung jawab requirement
  readonly tenantId: string; // Tenancy boundary (identity boundary compliance)
  readonly parentProductId: string; // ProductId dari produk yang memiliki requirement ini
  readonly linkedWorkIds: readonly WorkId[]; // Daftar Work yang mengekseskusi requirement ini
  readonly linkedOutcomeIds: readonly string[]; // Daftar outcome yang memenuhi requirement ini
}

/**
 * OutcomeNode: Node Outcome dalam High-Value Work Graph
 * Node hasil akhir dari sebuah Work yang menyelesaikan requirement dan memberi nilai ke produk
 */
export interface OutcomeNode {
  readonly id: string; // OutcomeId (immutable unique identifier)
  readonly name: string; // Nama outcome
  readonly type: string; // Tipe outcome (decision/approval/result) - sesuai migration 015
  readonly description: string; // Deskripsi hasil yang dicapai
  readonly workId: WorkId; // WorkId dari Work yang menghasilkan outcome ini (sesuai migration 015 work_id)
  readonly actorId: ActorId; // Actor yang menghasilkan outcome ini - sesuai migration 015
  readonly linkedRequirementIds: readonly string[]; // Requirement yang dipenuhi oleh outcome ini
  readonly evidenceIds: readonly string[]; // Bukti bahwa outcome telah tercapai
  readonly outcomeTimestamp: Readonly<Date>; // Timestamp ketika outcome tercapai (immutable)
  readonly tenantId: string; // Tenancy boundary (identity boundary compliance)
}

/**
 * HighValueWorkGraphQuery: Utility interface untuk query graph
 * Memudahkan traversal grafik dari level manapun (Product → Work → Outcome)
 */
export interface HighValueWorkGraphQuery {
  /**
   * Dapatkan semua Work yang terkait dengan sebuah Product
   */
  getWorksForProduct: (productId: string) => Promise<WorkId[]>;
  /**
   * Dapatkan semua Outcome yang dihasilkan dari sebuah Work
   */
  getOutcomesForWork: (workId: WorkId) => Promise<string[]>;
  /**
   * Dapatkan Product yang menjadi induk dari sebuah Work
   */
  getProductForWork: (workId: WorkId) => Promise<ProductNode | undefined>;
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
  workspaceId?: WorkspaceId;      // Execution Boundary only: Optional execution context container (never primary identity)
  actorId: ActorId;               // Attribution Continuity: Responsible actor for current action
  executionFrame?: ExecutionFrame; // Boundary Continuity: CMBCD execution boundary mechanism (Direct/Proxy/MCP/Constrained-GUI)
  title: string;                  // Semantic identity: Human-readable Work identity
  description?: string;           // Semantic context: Additional Work context
  platformMetadata?: Record<string, any>; // Context extension: Substrate-specific metadata (tidak mengubah makna)
  authorizedActors?: readonly { actorId: ActorId; role: string }[]; // Authorized actors for role-based authority checks (DEL-001)
  // Acceptance Contract - Signature requirements (FIN-001: Minimal extension)
  acceptanceContract?: {
    requiredSigners: ActorId[];
    completedSignatures: ActorId[];
    requirements: string[];
    expiresAt?: Date;
  };
  // HIGH-VALUE WORK GRAPH CORE LINKS (W-011: Product → Requirement → Work → Outcome linking)
  relatedProductIds: readonly string[]; // Semua product yang terhubung dengan Work ini
  relatedRequirementIds: readonly string[]; // Semua requirement yang harus dipenuhi Work ini
  relatedOutcomeIds: readonly string[]; // Semua outcome yang dihasilkan dari Work ini
  // W-002: HIGH-VALUE WORK BOUNDARY TRACKING (user mandate: maximize boundaries crossed per Work)
  boundariesCrossed?: readonly {
    boundaryType: "legal" | "service" | "compliance" | "finance" | "provider" | "domain" | "actor" | "workspace";
    timestamp: string; // ISO timestamp saat boundary dilewati
    previousContext: Record<string, string>; // Context sebelum crossing
    newContext: Record<string, string>; // Context setelah crossing
    evidenceId: string; // ID evidence yang mencatat crossing event
  }[]; // Daftar semua boundary yang telah dilewati Work ini (immutable append-only)
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