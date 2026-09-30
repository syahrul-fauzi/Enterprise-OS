// Import type definitions dari work-core dan identity (relative path yang benar)
import type {
  WorkId,
  TenantId,
  ActorId
} from "../../../identity/implementation/contracts/identity.contracts.ts";
import type { WorkAggregate } from "../../../work-core/contracts/work.contracts.ts";

// ==============================================
// 📌 COGNITIVE ADAPTER CAPABILITY CONTRACT (CONSTITUTIONAL)
// Semua model cognitive (SLM/LLM/human/planner) adalah ADAPTER, bukan sumber otoritas semantik
// Prinsip utama: Cognitive Non-Sovereignty - tidak ada komponen kognitif yang bisa memiliki Work
// Lifecycle: DORMANT → ACTIVE (via Cognitive Wake) → RELEASE → DORMANT
// ==============================================

// ==============================================
// 🧠 Cognitive Adapter Lifecycle States (constitutional)
// Lifecycle enforced by runtime: tidak pernah stay di ACTIVE selamanya
// ==============================================
type CognitiveAdapterState = "DORMANT" | "ACTIVE" | "RELEASED";

// ==============================================
// 📡 Cognitive Wake Signal (trigger untuk mengaktifkan adapter)
// Dikirimkan oleh EOS core hanya ketika diperlukan untuk resolusi ambiguitas
// ==============================================
interface CognitiveWakeSignal {
  readonly signalId: string;
  readonly workId: WorkId;
  readonly tenantId: TenantId;
  readonly wakeReason: "interpretation_required" | "reasoning_required" | "recovery_required" | "optimization_required" | "adaptation_required";
  readonly timestamp: Readonly<Date>;
  readonly maxActiveDurationMs: number; // Waktu maksimal adapter boleh stay ACTIVE
  readonly constraints: readonly string[]; // Constraints yang tidak boleh dilanggar selama aktif
}

// ==============================================
// 🎯 Kemampuan cognitive yang didukung (interchangeable)
// Daftar semua capability yang dapat diimplementasikan oleh adapter manapun
// ==============================================
const CognitiveCapabilityEnum = [
  "work.decompose",
  "work.plan",
  "work.route",
  "work.summarize",
  "work.classify",
  "work.propose",
  "work.interpret"
] as const;
type CognitiveCapability = typeof CognitiveCapabilityEnum[number];

// ==============================================
// 📥 Input Schema: SemanticWorkContext (hanya state semantik yang dibutuhkan)
// Tidak ada model memory atau conversation history yang dikirimkan
// ==============================================
interface SemanticWorkContext {
  readonly workId: WorkId;
  readonly tenantId: TenantId;
  readonly actorId: ActorId;
  readonly work: Readonly<WorkAggregate>; // Hanya state semantik Work yang terverifikasi
  readonly currentSemanticState: Readonly<Record<string, unknown>>; // State saat ini yang valid
  readonly constraints: readonly string[]; // Constraints yang tidak boleh dilanggar
  readonly previousEvidence: readonly unknown[]; // Evidence dari transisi sebelumnya
}

// ==============================================
// 📤 Output Schema: WorkPlanProposal (hanya proposal, bukan otoritas)
// Semua output dari reasoning capability adalah proposal yang harus divalidasi EOS
// ==============================================
interface WorkPlanProposal {
  readonly proposalId: string;
  readonly workId: WorkId;
  readonly capabilityUsed: CognitiveCapability;
  readonly adapterId: string; // ID model/human/planner yang menghasilkan proposal
  readonly timestamp: Readonly<Date>;
  readonly summary: string;
  readonly steps: readonly ReasoningStep[];
  readonly confidence: number; // 0.0 - 1.0, tidak menjadi dasar otoritas
}

interface ReasoningStep {
  readonly stepId: string;
  readonly description: string;
  readonly requiredCapability: string;
  readonly estimatedLatencyMs: number;
  readonly dependencies: readonly string[];
}

// ==============================================
// ⚙️ Requirements Schema: Persyaratan teknis untuk cognitive adapter
// Setiap adapter harus memenuhi semua requirement yang didefinisikan
// ==============================================
interface CognitiveAdapterRequirements {
  readonly structured_output: boolean;
  readonly schema_compliance: boolean;
  readonly max_latency_ms: number;
  readonly determinism_required: boolean;
  readonly input_tokens_max: number;
  readonly output_tokens_max: number;
  readonly lifecycle_compliance: boolean; // Harus mendukung DORMANT→ACTIVE→RELEASED cycle
}

// ==============================================
// 🔗 Kontrak utama yang harus diimplementasikan oleh semua cognitive adapter
// Setiap model (Phi-4-mini, SmolLM, Qwen, deterministic planner) adalah ADAPTER, bukan core
// Prinsip: Adapter tidak dapat memiliki semantic ownership terhadap Work - hanya propose
// ==============================================
interface CognitiveAdapter {
  readonly adapterId: string;
  readonly adapterName: string; // Nama model/manusia/planner (hanya untuk logging)
  readonly currentState: CognitiveAdapterState; // DORMANT by default
  readonly supportedCapabilities: readonly CognitiveCapability[];
  readonly requirements: CognitiveAdapterRequirements;
  readonly isAvailable: () => Promise<boolean>;
  
  // Lifecycle methods (dipanggil oleh EOS core)
  wake(signal: CognitiveWakeSignal): Promise<void>; // Transition DORMANT → ACTIVE
  release(): Promise<void>; // Transition ACTIVE → RELEASED → DORMANT
  
  // Metode utama: execute cognitive capability - HANYA MENGHASILKAN PROPOSAL, BUKAN KEPUTUSAN
  execute<TInput, TOutput>(
    capability: CognitiveCapability,
    input: TInput,
    context: SemanticWorkContext
  ): Promise<TOutput>;
}

// ==============================================
// 📦 Repository interface untuk mengelola semua cognitive adapter
// ==============================================
interface CognitiveAdapterRepository {
  readonly entityName: "CognitiveAdapter";
  readonly kind: "repository";
  list(): readonly CognitiveAdapter[];
  byCapability(capability: CognitiveCapability): CognitiveAdapter | undefined;
  byId(id: string): CognitiveAdapter | undefined;
  register(adapter: CognitiveAdapter): void;
  unregister(id: string): void;
}

// ==============================================
// 📡 Input/Output untuk dispatch cognitive capability
// Interface yang digunakan oleh capability lain untuk memanggil cognitive adapter
// ==============================================
interface DispatchCognitiveInput {
  readonly workId: WorkId;
  readonly capability: CognitiveCapability;
  readonly preferredAdapterId?: string; // Bisa pilih adapter spesifik, tapi tidak wajib
  readonly customInputs?: Readonly<Record<string, unknown>>;
  readonly wakeReason: CognitiveWakeSignal["wakeReason"]; // Harus tentukan alasan wake
}

interface DispatchCognitiveOutput<TProposal = WorkPlanProposal> {
  readonly proposal: TProposal;
  readonly adapterUsed: string;
  readonly validationRequired: boolean; // SELALU true: semua proposal harus divalidasi EOS
}

// ==============================================
// 📋 Output interface untuk setiap kemampuan reasoning spesifik
// Semua output hanyalah proposal - TIDAK PERNAH menjadi otoritas akhir
// ==============================================
interface WorkClassificationProposal {
  readonly workId: WorkId;
  readonly classifiedAs: string;
  readonly confidence: number;
  readonly classificationRationale: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

interface WorkRouteProposal {
  readonly workId: WorkId;
  readonly recommendedActorId: ActorId;
  readonly routingRationale: string;
  readonly estimatedLatencyMs: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

interface WorkSummaryProposal {
  readonly workId: WorkId;
  readonly summary: string;
  readonly keyMilestones: readonly string[];
  readonly pendingDecisions: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// Export SEMUA type dan enum untuk dipakai oleh service.ts dan capability lain
export type {
  WorkId,
  TenantId,
  ActorId,
  WorkAggregate,
  CognitiveAdapterState,
  CognitiveWakeSignal,
  CognitiveCapability,
  SemanticWorkContext,
  WorkPlanProposal,
  ReasoningStep,
  CognitiveAdapterRequirements,
  CognitiveAdapter,
  CognitiveAdapterRepository,
  DispatchCognitiveInput,
  DispatchCognitiveOutput,
  WorkClassificationProposal,
  WorkRouteProposal,
  WorkSummaryProposal
};

export { CognitiveCapabilityEnum };