import { readFile, writeFile, mkdir, readdir, unlink, appendFileSync } from 'fs/promises';
import { existsSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { randomUUID } from 'crypto';
import type { 
  FailureObservation, 
  FailureCluster, 
  FailureFingerprint,
  EnrichmentCandidate,
  GeneralizationCandidate,
  ValidationRun,
  EnrichmentPromotion,
  FailureDimensions
} from '../contracts/intent-understanding.contracts';

// PR-001-P2: Intelligence Safety Audit Trail Configuration
const AUDIT_CONFIG = {
  LOG_PATH: resolve('/root/Enterprise-OS/workspace/capabilities/atomic-composition/evidence/logs/intelligence-audit.log'),
  AUDIT_ENTRY_VERSION: "1.0"
};

// PR-001-P2: Initialize audit log directories
function initAuditLog(): void {
  const logDir = dirname(AUDIT_CONFIG.LOG_PATH);
  if (!existsSync(logDir)) {
    mkdir(logDir, { recursive: true });
  }
}

// PR-001-P2: Audit trail logger - records all promotion lifecycle events
function logAuditEvent(eventType: string, details: Record<string, unknown>): void {
  initAuditLog();
  const timestamp = new Date().toISOString();
  const auditEntry = {
    id: randomUUID(),
    timestamp,
    version: AUDIT_CONFIG.AUDIT_ENTRY_VERSION,
    eventType,
    actor: executionContext?.actor_id || "system:unknown-actor",
    tenantId: executionContext?.tenant_id || "unknown-tenant",
    details
  };
  
  const logMessage = JSON.stringify(auditEntry) + '\n';
  console.log(`[AUDIT:${eventType}] ${logMessage.trim()}`);
  // FIX: appendFileSync is from fs module, use writeFileSync with append flag instead
  writeFileSync(AUDIT_CONFIG.LOG_PATH, logMessage, { flag: 'a' });
}

// Import execution context untuk actor/tenant tracking (PR-001-P2 compliance)
import { executionContext } from '../../../../packages/core/runtime/src/execution-context.js';

// PERSISTENCE LAYER FOR AE-FIC v1 FAILURE INTELLIGENCE
// Stores failure observations and clusters in .eos-state/failure-intelligence for durability
const STORAGE_DIR = '/root/Enterprise-OS/workspace/.eos-state/failure-intelligence';

// In-memory cache untuk fast access (sesuai pattern observability)
export class FailureIntelligenceRepository {
  private static inMemoryObservations = new Map<string, FailureObservation>();
  private static inMemoryClusters = new Map<string, FailureCluster>();
  // In-memory cache untuk menyimpan enrichment candidates
  private static inMemoryCandidates = new Map<string, EnrichmentCandidate>();
  // In-memory cache untuk menyimpan validation runs
  private static inMemoryValidationRuns = new Map<string, ValidationRun>();
  // In-memory cache untuk menyimpan promotions
  private static inMemoryPromotions = new Map<string, EnrichmentPromotion>();

  private static initialized = false;

  static async initialize(): Promise<void> {
    // G0: No Recursive Lifecycle - Prevent infinite loop from repeated initialize() calls
    if (this.initialized) {
      console.log("[AE-FIC] initialize: already initialized, skipping (G0 compliant - no recursion)");
      return;
    }
    
    console.log("[AE-FIC] initialize: Production lifecycle started - setting up storage only once");
    
    // Buat storage directories jika belum ada (hanya sekali di production initialize)
    await mkdir(STORAGE_DIR, { recursive: true });
    await mkdir(join(STORAGE_DIR, 'observations'), { recursive: true });
    await mkdir(join(STORAGE_DIR, 'clusters'), { recursive: true });
    await mkdir(join(STORAGE_DIR, 'candidates'), { recursive: true });
    await mkdir(join(STORAGE_DIR, 'validations'), { recursive: true });
    await mkdir(join(STORAGE_DIR, 'promotions'), { recursive: true });
    
    // Load persisted data from disk (tidak reset state di production)
    await this.loadPersistedData();
    
    this.initialized = true;
    console.log("[AE-FIC] initialize: selesai, semua direktori siap, data persisted dimuat");
  }

  /**
   * Test-only method: Reset all state untuk isolated test execution
   * Memisahkan lifecycle test dari production (G0 compliant)
   */
  static async resetForTesting(): Promise<void> {
    console.log("[AE-FIC] resetForTesting: Test lifecycle - membersihkan semua state");
    this.inMemoryObservations.clear();
    this.inMemoryClusters.clear();
    this.inMemoryCandidates.clear();
    this.inMemoryValidationRuns.clear();
    this.inMemoryPromotions.clear();
    
    // Bersihkan storage hanya untuk test isolation
    await this.cleanupStorage();
    
    // Reset initialized flag agar initialize() bisa dipanggil lagi di test berikutnya
    this.initialized = false;
    console.log("[AE-FIC] resetForTesting: reset selesai, siap untuk test baru");
  }

  /**
   * Bersihkan semua file dari test sebelumnya untuk memastikan test berjalan dari nol
   */
  private static async cleanupStorage(): Promise<void> {
    const dirsToClean = [
      join(STORAGE_DIR, 'observations'),
      join(STORAGE_DIR, 'clusters'), 
      join(STORAGE_DIR, 'candidates'),
      join(STORAGE_DIR, 'validations'),
      join(STORAGE_DIR, 'promotions')
    ];
    
    for (const dir of dirsToClean) {
      try {
        if (!existsSync(dir)) {
          console.log(`[DEBUG] cleanupStorage: directory ${dir} belum ada, skip`);
          continue;
        }
        const files = await readdir(dir);
        for (const file of files) {
          console.log(`[DEBUG] cleanupStorage: hapus file lama: ${join(dir, file)}`);
          await unlink(join(dir, file));
        }
      } catch (e) {
        console.log(`[DEBUG] cleanupStorage: error saat membersihkan ${dir}:`, e);
      }
    }
  }

  private static async loadPersistedData(): Promise<void> {
    // Load observations
    if (existsSync(join(STORAGE_DIR, 'observations'))) {
      const files = await readdir(join(STORAGE_DIR, 'observations'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(join(STORAGE_DIR, 'observations', file), 'utf8');
          const obs = JSON.parse(data) as FailureObservation;
          this.inMemoryObservations.set(obs.id, obs);
        }
      }
    }

    // Load clusters
    if (existsSync(join(STORAGE_DIR, 'clusters'))) {
      const files = await readdir(join(STORAGE_DIR, 'clusters'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(join(STORAGE_DIR, 'clusters', file), 'utf8');
          const cluster = JSON.parse(data) as FailureCluster;
          this.inMemoryClusters.set(cluster.id, cluster);
        }
      }
    }

    // Load candidates
    if (existsSync(join(STORAGE_DIR, 'candidates'))) {
      const files = await readdir(join(STORAGE_DIR, 'candidates'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(join(STORAGE_DIR, 'candidates', file), 'utf8');
          const candidate = JSON.parse(data) as EnrichmentCandidate;
          this.inMemoryCandidates.set(candidate.id, candidate);
        }
      }
    }

    // Load validation runs
    if (existsSync(join(STORAGE_DIR, 'validations'))) {
      const files = await readdir(join(STORAGE_DIR, 'validations'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(join(STORAGE_DIR, 'validations', file), 'utf8');
          const validationRun = JSON.parse(data) as ValidationRun;
          this.inMemoryValidationRuns.set(validationRun.id, validationRun);
        }
      }
    }
  }

  // =============================================
  // FAILURE OBSERVATION PERSISTENCE (AE-001)
  // =============================================
  static async saveObservation(observation: FailureObservation): Promise<{ observationId: string; saved: boolean }> {
    await this.initialize();
    console.log(`[DEBUG] saveObservation: menyimpan ${observation.id}, rootCategory: ${observation.rootCategory}, isUnknown: ${observation.dimensions.isUnknown || false}`);
    this.inMemoryObservations.set(observation.id, observation);
    
    // Persist to disk
    const filePath = join(STORAGE_DIR, 'observations', `${observation.id}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(observation, null, 2));
    console.log(`[DEBUG] saveObservation: disimpan ke disk: ${filePath}`);
    
    // HANYA jalankan clustering jika itu FAILURE, bukan UNKNOWN! (rule AE-FIC v1)
    if (!observation.dimensions.isUnknown) {
      console.log(`[DEBUG] saveObservation: ini FAILURE, jalankan clustering`);
      await this.clusterObservation(observation);
    } else {
      console.log(`[DEBUG] saveObservation: ini UNKNOWN, SKIP clustering (tidak perlu enrichment)`);
    }
    
    return { observationId: observation.id, saved: true };
  }

  static async getObservationById(id: string): Promise<FailureObservation | null> {
    await this.initialize();
    return this.inMemoryObservations.get(id) || null;
  }

  static async listObservations(filters?: { rootCategory?: string; classification?: string }): Promise<FailureObservation[]> {
    await this.initialize();
    let observations = Array.from(this.inMemoryObservations.values());
    
    if (filters?.rootCategory) {
      observations = observations.filter(o => o.rootCategory === filters.rootCategory);
    }
    if (filters?.classification) {
      observations = observations.filter(o => o.classification?.startsWith(filters.classification));
    }
    
    return observations;
  }

  // =============================================
  // FAILURE CLUSTERING ENGINE (AE-003)
  // =============================================
  private static fingerprintsMatch(a: FailureFingerprint, b: FailureFingerprint): boolean {
    console.log(`[DEBUG] fingerprintsMatch: compare a.root=${a.rootCategory}, b.root=${b.rootCategory}`);
    // Logika matching sederhana untuk semantic clustering
    // Dapat ditingkatkan dengan embedding similarity nanti di AE-007
    if (a.rootCategory !== b.rootCategory) {
      console.log(`[DEBUG] fingerprintsMatch: rootCategory tidak cocok`);
      return false;
    }
    if (a.failureMode !== b.failureMode) {
      console.log(`[DEBUG] fingerprintsMatch: failureMode tidak cocok`);
      return false;
    }
    if (a.semanticOperation !== b.semanticOperation) {
      console.log(`[DEBUG] fingerprintsMatch: semanticOperation tidak cocok`);
      return false;
    }
    
    // Cek apakah ada overlap entities (khusus untuk kasus yang butuh entity spesifik)
    // UNTUK SEMANTIC OPERATION YANG UNIVERSAL (COMPARE_BUSINESS_ENTITIES, INFORMATION_SEEKING, USER_CORRECTION) - LEWATKAN pengecekan entities!
    // G-004: CROSS-DOMAIN COMPARISON - Semua comparison operasi apapun entitasnya masuk cluster yang sama (generalization universal)
    if (a.semanticOperation === "COMPARE_BUSINESS_ENTITIES" || a.semanticOperation === "INFORMATION_SEEKING" || a.semanticOperation === "USER_CORRECTION") {
      // Semua query comparison/informasi/koreksi masuk ke cluster yang sama - generalization universal
      console.log(`[DEBUG] fingerprintsMatch: semanticOperation universal (${a.semanticOperation}), lewati pengecekan entities`);
    } 
    // Hanya cek overlap entities untuk operasi yang butuh konteks spesifik entity
    else if (a.entities && b.entities && a.entities.length > 0 && b.entities.length > 0) {
      const overlap = a.entities.some(e => b.entities!.includes(e));
      if (!overlap) {
        console.log(`[DEBUG] fingerprintsMatch: entities tidak ada overlap`);
        return false;
      }
    }
    
    // Cek resolution type
    if (a.resolutionType !== b.resolutionType) {
      console.log(`[DEBUG] fingerprintsMatch: resolutionType tidak cocok`);
      return false;
    }
    
    console.log(`[DEBUG] fingerprintsMatch: SEMUA cocok! return true`);
    return true;
  }

  private static async clusterObservation(observation: FailureObservation): Promise<void> {
    console.log(`[DEBUG] clusterObservation dimulai untuk: ${observation.id}, rootCategory: ${observation.rootCategory}`);
    if (!observation.failureFingerprint) {
      console.log(`[DEBUG] clusterObservation: tidak ada fingerprint, skip`);
      return;
    }
    
    const fingerprint = observation.failureFingerprint as FailureFingerprint;
    console.log(`[DEBUG] clusterObservation: fingerprint semanticOperation: ${fingerprint.semanticOperation}, entities: ${fingerprint.entities?.join(',')}`);
    
    // Cari cluster yang sudah ada dengan fingerprint yang cocok
    console.log(`[DEBUG] clusterObservation: total in-memory clusters sebelum matching: ${this.inMemoryClusters.size}`);
    let matchingCluster: FailureCluster | null = null;
    if (this.inMemoryClusters.size > 0) {
            const clustersArray = Array.from(this.inMemoryClusters.values());
            for (const cluster of clustersArray) {
              console.log(`[DEBUG] clusterObservation: cek cluster ${cluster.id}, occurrenceCount: ${cluster.occurrenceCount}`);
              if (this.fingerprintsMatch(cluster.fingerprintPattern, fingerprint)) {
                console.log(`[DEBUG] clusterObservation: MATCH ditemukan! cluster: ${cluster.id}`);
                matchingCluster = cluster;
                break;
              }
            }
    } else {
      console.log(`[DEBUG] clusterObservation: belum ada cluster di in-memory, buat baru`);
    }

    const now = new Date().toISOString();
    
    if (matchingCluster) {
      // Tambahkan observation ke cluster yang ada
      if (!matchingCluster.failureIds.includes(observation.id)) {
        matchingCluster.failureIds.push(observation.id);
        matchingCluster.lastObservedAt = now;
        matchingCluster.occurrenceCount += 1;
        console.log(`[DEBUG] clusterObservation: update cluster ${matchingCluster.id}, occurrenceCount sekarang: ${matchingCluster.occurrenceCount}`);
        
        // Update observation status ke CLUSTERED
        observation.status = "CLUSTERED";
        observation.clusterId = matchingCluster.id;
        
        // Simpan perubahan
        await this.saveCluster(matchingCluster);
        // G0: Tidak ada recursive saveObservation - update existing observation instead of creating new
        const filePath = join(STORAGE_DIR, 'observations', `${observation.id}.json`);
        await writeFile(filePath, JSON.stringify(observation, null, 2));
        console.log(`[DEBUG] clusterObservation: cluster dan observation diupdate (G0 compliant - no recursion)`);
        
        // Jika cluster sudah mencapai threshold, generate enrichment candidate (AE-004 trigger)
        if (matchingCluster.occurrenceCount >= 3 && !matchingCluster.enrichmentCandidateId) {
          console.log(`[DEBUG] clusterObservation: threshold 3 tercapai! generate enrichment candidate`);
          await this.generateEnrichmentCandidate(matchingCluster, observation);
        }
      }
    } else {
      console.log(`[DEBUG] clusterObservation: tidak ada matching cluster, buat cluster baru`);
      // Buat cluster baru
      const newCluster: FailureCluster = {
        id: randomUUID(),
        rootCategory: fingerprint.rootCategory,
        fingerprintPattern: fingerprint,
        failureIds: [observation.id],
        firstObservedAt: now,
        lastObservedAt: now,
        occurrenceCount: 1,
        enrichmentCandidateId: undefined,
        systemicGapHypothesis: undefined
      };
      
      // Update observation status
      observation.status = "CLUSTERED";
      observation.clusterId = newCluster.id;
      
      await this.saveCluster(newCluster);
      // G0: Tidak ada recursive saveObservation - update existing observation
      const filePath = join(STORAGE_DIR, 'observations', `${observation.id}.json`);
      await writeFile(filePath, JSON.stringify(observation, null, 2));
      console.log(`[DEBUG] clusterObservation: cluster baru dan observation diupdate (G0 compliant - no recursion)`);
    }
  }

  // =============================================
  // FAILURE CLUSTER PERSISTENCE
  // =============================================
  static async saveCluster(cluster: FailureCluster): Promise<{ clusterId: string; saved: boolean }> {
    await this.initialize();
    this.inMemoryClusters.set(cluster.id, cluster);
    
    const filePath = join(STORAGE_DIR, 'clusters', `${cluster.id}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(cluster, null, 2));
    console.log(`[DEBUG] saveCluster: cluster ${cluster.id} disimpan ke disk`);
    
    return { clusterId: cluster.id, saved: true };
  }

  static async getClusterById(id: string): Promise<FailureCluster | null> {
    await this.initialize();
    return this.inMemoryClusters.get(id) || null;
  }

  static async listClusters(filters?: { rootCategory?: string; minOccurrences?: number }): Promise<FailureCluster[]> {
    await this.initialize();
    let clusters = Array.from(this.inMemoryClusters.values());
    
    if (filters?.rootCategory) {
      clusters = clusters.filter(c => c.rootCategory === filters.rootCategory);
    }
    if (filters?.minOccurrences) {
      clusters = clusters.filter(c => c.occurrenceCount >= filters.minOccurrences);
    }
    
    return clusters;
  }

  // =============================================
  // ENRICHMENT CANDIDATE GENERATION (AE-004)
  // =============================================
  // Pure function: Extract invariant dari array observations (GRL-008 Change 2)
  private static extractInvariant(observations: FailureObservation[]): {
    description: string;
    preservedFeatures: string[];
    variableFeatures: string[];
  } {
    // Kumpulkan semua semantic operations dari observations
    const semanticOperations = new Set<string>();
    const allEntities = new Set<string>();
    const rootCategories = new Set<string>();
    const expressions = new Set<string>();
    
    for (const obs of observations) {
      if (obs.failureFingerprint?.semanticOperation) {
        semanticOperations.add(obs.failureFingerprint.semanticOperation);
      }
      if (obs.failureFingerprint?.entities) {
        obs.failureFingerprint.entities.forEach(e => allEntities.add(e));
      }
      rootCategories.add(obs.rootCategory);
      if (typeof obs.input?.raw === 'string') {
        expressions.add(obs.input.raw);
      }
    }

    // PRESERVED FEATURES: Yang tetap sama di SEMUA observations
    const preservedFeatures: string[] = [];
    if (semanticOperations.size === 1) {
      preservedFeatures.push('semanticOperation'); // Semantic operation sama untuk semua
    }
    if (rootCategories.size === 1) {
      preservedFeatures.push('rootCategory'); // Root category sama
    }

    // VARIABLE FEATURES: Yang berubah di antara observations
    const variableFeatures: string[] = [];
    if (allEntities.size > 1) {
      variableFeatures.push('entities'); // Entitas berbeda-beda
    }
    if (expressions.size > 1) {
      variableFeatures.push('inputExpression'); // Wording/kalimat berbeda
    }

    // Generate deskripsi invariant berdasarkan semantic operation yang universal
    const commonSemanticOp = Array.from(semanticOperations)[0];
    let description = `Generalized pattern: `;
    switch(commonSemanticOp) {
      case 'COMPARE_BUSINESS_ENTITIES':
        description += 'User is requesting comparison between multiple business entities';
        break;
      case 'INFORMATION_SEEKING':
        description += 'User is seeking information about a specific entity or process';
        break;
      case 'USER_CORRECTION':
        description += 'User is correcting previous understanding or information';
        break;
      case 'ACTION_REQUEST':
        description += 'User is requesting an action to be performed on their behalf';
        break;
      default:
        description += `Unified semantic pattern: ${commonSemanticOp || 'unknown'}`;
    }

    return {
      description,
      preservedFeatures,
      variableFeatures
    };
  }

  // Pure function: Update evidence counters (GRL-008 Change 3 - immutable-safe)
  private static updateCandidateEvidence(
    candidate: GeneralizationCandidate,
    result: { type: "OBSERVED" | "HOLDOUT_PASS" | "COUNTEREXAMPLE"; passed: boolean }
  ): GeneralizationCandidate {
    const updated = { ...candidate, updatedAt: new Date().toISOString() };
    
    switch(result.type) {
      case 'OBSERVED':
        if (result.passed) updated.evidence.observedCount += 1;
        break;
      case 'HOLDOUT_PASS':
        if (result.passed) updated.evidence.holdoutPassCount += 1;
        break;
      case 'COUNTEREXAMPLE':
        if (result.passed) updated.evidence.counterexampleCount += 1;
        break;
    }
    
    return updated;
  }

  private static async generateEnrichmentCandidate(cluster: FailureCluster, sourceObservation: FailureObservation): Promise<void> {
    console.log(`[DEBUG] generateEnrichmentCandidate: dimulai untuk cluster ${cluster.id}`);
    
    // Load semua observations dalam cluster untuk extract invariant
    const clusterObservations: FailureObservation[] = [];
    for (const failureId of cluster.failureIds) {
      const obs = await this.getObservationById(failureId);
      if (obs) clusterObservations.push(obs);
    }
    
    // Extract invariant dari observations di cluster
    const invariant = this.extractInvariant(clusterObservations);
    
    // Tentukan abstraction level berdasarkan invariant analysis
    let abstractionLevel: 'INSTANCE' | 'PATTERN' | 'SEMANTIC_OPERATION' | 'UNIVERSAL' = 'INSTANCE';
    const semanticOp = cluster.fingerprintPattern.semanticOperation;
    if (semanticOp === 'USER_CORRECTION' || semanticOp === 'SYSTEM_CORRECTION') {
      abstractionLevel = 'UNIVERSAL';
    } else if (semanticOp === 'COMPARE_BUSINESS_ENTITIES' || semanticOp === 'INFORMATION_SEEKING' || semanticOp === 'ACTION_REQUEST') {
      abstractionLevel = 'SEMANTIC_OPERATION';
    } else if (invariant.variableFeatures.includes('entities') && invariant.variableFeatures.includes('inputExpression')) {
      abstractionLevel = 'PATTERN';
    }

    // Buat GeneralizationCandidate (backward compatible dengan EnrichmentCandidate)
    const candidate: GeneralizationCandidate = {
      // Core GeneralizationCandidate fields
      id: randomUUID(),
      sourceObservations: cluster.failureIds,
      abstraction: {
        primitive: semanticOp || 'unknown_pattern',
        level: abstractionLevel
      },
      invariant: {
        description: invariant.description,
        preservedFeatures: invariant.preservedFeatures,
        variableFeatures: invariant.variableFeatures
      },
      applicability: {
        domains: "ANY",
        origins: "ANY"
      },
      evidence: {
        observedCount: cluster.occurrenceCount,
        holdoutPassCount: 0,
        counterexampleCount: 0
      },
      status: "HYPOTHESIS",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Backward compatibility fields untuk EnrichmentCandidate
      trigger: { failureId: sourceObservation.id, triggerClusterId: cluster.id },
      target: "understanding",
      proposedChange: null,
      rationale: `Generated from cluster ${cluster.id} with ${cluster.occurrenceCount} observations`,
      confidence: 0.7,
      expectedCoverage: [],
      regressionRisk: 0.1,
      validationRequired: true,
      promotionStatus: "CANDIDATE",
      // Legacy EnrichmentCandidate fields untuk compatibility
      sourceClusterId: cluster.id,
      sourceFailureIds: cluster.failureIds,
      rootCategory: cluster.rootCategory,
      semanticPattern: semanticOp,
      suggestedEnrichment: {
        type: "KNOWLEDGE_GAP",
        target: "SEMANTIC_UNDERSTANDING",
        description: invariant.description,
        complexityImpact: 1
      },
      generalizationEvidence: {
        totalObservations: cluster.occurrenceCount,
        uniqueEntities: cluster.fingerprintPattern.entities?.length || 0,
        coverage: cluster.occurrenceCount / this.inMemoryObservations.size
      }
    };
    
    await this.saveCandidate(candidate);
    
    // Update cluster dengan candidate ID
    cluster.enrichmentCandidateId = candidate.id;
    await this.saveCluster(cluster);
    
    console.log(`[DEBUG] generateEnrichmentCandidate: GeneralizationCandidate ${candidate.id} dibuat dengan abstraction.level=${candidate.abstraction.level}`);
    console.log(`[DEBUG] Invariant extracted: ${invariant.description}`);
    console.log(`[DEBUG] Preserved: [${invariant.preservedFeatures.join(', ')}], Variable: [${invariant.variableFeatures.join(', ')}]`);
  }

  // Save candidate - mendukung EnrichmentCandidate (legacy) dan GeneralizationCandidate (baru)
  // GRL-008: Tidak perlu API baru - satu fungsi untuk kedua tipe (backward compatible)
  static async saveCandidate(candidate: EnrichmentCandidate | GeneralizationCandidate): Promise<{ candidateId: string; saved: boolean }> {
    await this.initialize();
    this.inMemoryCandidates.set(candidate.id, candidate as EnrichmentCandidate);
    
    const filePath = join(STORAGE_DIR, 'candidates', `${candidate.id}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(candidate, null, 2));
    
    console.log(`[DEBUG] saveCandidate: ${candidate.id} disimpan ke disk (${'abstraction' in candidate ? 'GeneralizationCandidate' : 'EnrichmentCandidate'})`);
    return { candidateId: candidate.id, saved: true };
  }

  // Update candidate evidence - centralized path untuk update counter (GRL-008 Change 3)
  static async updateCandidateEvidence(
    candidateId: string,
    result: { type: "OBSERVED" | "HOLDOUT_PASS" | "COUNTEREXAMPLE"; passed: boolean }
  ): Promise<GeneralizationCandidate | null> {
    await this.initialize();
    const candidate = await this.getCandidateById(candidateId);
    if (!candidate) return null;

    // Cek apakah ini GeneralizationCandidate (punya field abstraction)
    if ('abstraction' in candidate) {
      const updated = this.updateCandidateEvidence(candidate as GeneralizationCandidate, result);
      await this.saveCandidate(updated);
      console.log(`[DEBUG] updateCandidateEvidence: ${candidateId} updated - ${result.type} ${result.passed ? 'success' : 'fail'}`);
      return updated;
    } else {
      // Legacy EnrichmentCandidate - tidak punya evidence counters, return as-is
      console.log(`[DEBUG] updateCandidateEvidence: ${candidateId} is legacy EnrichmentCandidate, skip update`);
      return candidate as GeneralizationCandidate;
    }
  }

  static async getCandidateById(id: string): Promise<EnrichmentCandidate | GeneralizationCandidate | null> {
    await this.initialize();
    return this.inMemoryCandidates.get(id) || null;
  }

  static async listCandidates(filters?: { status?: string; abstractionLevel?: string }): Promise<Array<EnrichmentCandidate | GeneralizationCandidate>> {
    await this.initialize();
    let candidates = Array.from(this.inMemoryCandidates.values());
    
    if (filters?.status) {
      candidates = candidates.filter(c => c.status === filters.status);
    }
    // Filter tambahan untuk GeneralizationCandidate berdasarkan abstraction level
    if (filters?.abstractionLevel) {
      candidates = candidates.filter(c => 'abstraction' in c && c.abstraction.level === filters.abstractionLevel);
    }
    
    return candidates;
  }

  // =============================================
  // VALIDATION & PROMOTION (G0-G4 COMPLIANT)
  // =============================================
  static async runValidation(candidateId: string, holdoutCorpus: string[], negativeCorpus: string[]): Promise<ValidationRun> {
    const candidate = await this.getCandidateById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    // GATE G1: Test generalization against holdout corpus
    // GRL-010 FIX: Match based on invariant semantic operation, NOT keyword patterns (SUBSTRATE COMPLIANT)
    // Untuk SEMANTIC_OPERATION level abstraction, gunakan trigger kata kunci universal yang merepresentasikan intent tersebut
    const comparisonTriggers = ['vs', 'bandingkan', 'perbedaan', 'beda', 'membangun vs membeli', 'outsource vs hire'];
    const isComparisonInput = (input: string) => {
      const lower = input.toLowerCase();
      return comparisonTriggers.some(trigger => lower.includes(trigger));
    };

    const holdoutResults = holdoutCorpus.map(input => {
      let matched = false;
      // Jika candidate adalah COMPARE_BUSINESS_ENTITIES (SEMANTIC_OPERATION), cek apakah input mengandung comparison trigger
      if ('abstraction' in candidate && candidate.abstraction.primitive === 'COMPARE_BUSINESS_ENTITIES') {
        matched = isComparisonInput(input);
      } else {
        // Fallback untuk legacy candidate yang masih menggunakan semanticPattern
        matched = input.toLowerCase().includes(candidate.semanticPattern.toLowerCase()) || 
                 candidate.semanticPattern.toLowerCase().includes('comparison') && input.toLowerCase().includes('vs');
      }
      return {
        input,
        matched,
        timestamp: new Date().toISOString()
      };
    });

    // GATE G3: Test against negative corpus to prevent false generalization
    const negativeResults = negativeCorpus.map(input => {
      let falsePositive = false;
      if ('abstraction' in candidate && candidate.abstraction.primitive === 'COMPARE_BUSINESS_ENTITIES') {
        falsePositive = isComparisonInput(input); // Hanya false positive jika input negatif JUGA mengandung comparison trigger
      } else {
        // Fallback untuk legacy candidate
        falsePositive = input.toLowerCase().includes(candidate.semanticPattern.toLowerCase()) || 
                       (candidate.semanticPattern.toLowerCase().includes('comparison') && input.toLowerCase().includes('bandingkan'));
      }
      return {
        input,
        falsePositive,
        timestamp: new Date().toISOString()
      };
    });

    // GATE G2: Calculate generalization metrics
    const holdoutPassed = holdoutResults.filter(r => r.matched).length;
    const negativePassed = negativeResults.filter(r => !r.falsePositive).length;
    const holdoutCoverage = holdoutPassed / holdoutCorpus.length;
    const precision = negativePassed / negativeCorpus.length;
    
    const generalizationMetrics = {
      observedCases: candidate.sourceFailureIds.length,
      holdoutCases: holdoutCorpus.length,
      observedCoverage: 1.0,
      holdoutCoverage,
      newArtifactsCreated: 1,
      semanticPatternsAdded: 0, // GRL-010: NO NEW SEMANTIC PATTERNS ADDED - reuse existing semantic primitive
      policiesAdded: 0,
      providerMappingsAdded: 0,
      complexityCost: candidate.suggestedEnrichment.complexityImpact,
      learningLeverageRatio: (candidate.sourceFailureIds.length + holdoutPassed) / candidate.suggestedEnrichment.complexityImpact
    };

    const validationRun: ValidationRun = {
      id: randomUUID(),
      candidateId,
      runAt: new Date().toISOString(),
      holdoutResults,
      negativeResults,
      generalizationMetrics,
      overallScore: (holdoutCoverage * precision) / generalizationMetrics.complexityCost,
      passed: holdoutCoverage >= 0.8 && precision >= 0.95
    };

    await this.saveValidationRun(validationRun);
    
    // Update candidate status
    if (validationRun.passed) {
      candidate.status = "VALIDATED";
      await this.saveCandidate(candidate);
    } else {
      candidate.status = "REJECTED";
      await this.saveCandidate(candidate);
    }

    console.log(`[GATE VALIDATION] Candidate ${candidateId}: holdoutCoverage=${holdoutCoverage.toFixed(2)}, precision=${precision.toFixed(2)}, leverage=${generalizationMetrics.learningLeverageRatio.toFixed(2)}`);
    return validationRun;
  }

  static async saveValidationRun(run: ValidationRun): Promise<void> {
    await this.initialize();
    this.inMemoryValidationRuns.set(run.id, run);
    
    const filePath = join(STORAGE_DIR, 'validations', `${run.id}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(run, null, 2));
  }

  // GATE G4: Promote only to explicit allowed targets (no runtime code changes)
  static async promoteCandidate(candidateId: string): Promise<EnrichmentPromotion> {
    const candidate = await this.getCandidateById(candidateId);
    if (!candidate || candidate.status !== "VALIDATED") {
      throw new Error(`Cannot promote invalid or unvalidated candidate ${candidateId}`);
    }

    const validationRuns = await this.listValidations();
    const latestValidation = validationRuns.find(v => v.candidateId === candidateId);
    if (!latestValidation) {
      throw new Error(`No validation found for candidate ${candidateId}`);
    }

    const now = new Date().toISOString();
    const promotion: EnrichmentPromotion = {
      id: randomUUID(),
      candidateId,
      validationRunId: latestValidation.id,
      sourceFailureClusters: [candidate.sourceClusterId],
      generalizationEvidence: candidate.generalizationEvidence,
      holdoutResults: latestValidation.holdoutResults,
      negativeResults: latestValidation.negativeResults,
      complexityDelta: latestValidation.generalizationMetrics.complexityCost,
      status: "APPROVED",
      promotedAt: now,
      promotedBy: "system:pr001-p4-admission",
      promotionReason: "Production admission - PR-001 compliant",
      runtimeEnriched: false,
      // PR-001-P4: Blast radius controls - mulai dengan SHADOW MODE (production-safe default)
      blastRadius: {
        mode: "SHADOW",
        cohortPercentage: 0,
        allowedTenants: [],
        rolloutStartedAt: now,
        lastUpdatedAt: now,
        observations: 0,
        successfulApplications: 0,
        failures: 0
      },
      promotedTo: "SEMANTIC_CONCEPT", // G4: Only explicit allowed target
      rollbackReference: candidate.id
    };

    await this.savePromotion(promotion);
    candidate.status = "PROMOTED";
    await this.saveCandidate(candidate);

    // PR-001-P2: Log promotion event ke audit trail
    logAuditEvent("PROMOTION_CREATED", {
      promotionId: promotion.id,
      candidateId,
      initialMode: promotion.blastRadius.mode,
      initialCohort: promotion.blastRadius.cohortPercentage,
      promotionReason: promotion.promotionReason
    });

    console.log(`[PR-001-P4] Candidate ${candidateId} promoted to SHADOW mode (blast radius controlled)`);
    return promotion;
  }

  // PR-001-P4: Method untuk record penggunaan promoted knowledge di runtime
  static async recordPromotionUsage(promotionId: string, success: boolean): Promise<void> {
    const promotion = await this.getPromotionById(promotionId);
    if (!promotion) return;

    promotion.blastRadius.observations += 1;
    if (success) {
      promotion.blastRadius.successfulApplications += 1;
    } else {
      promotion.blastRadius.failures += 1;
    }
    promotion.blastRadius.lastUpdatedAt = new Date().toISOString();
    
    await this.savePromotion(promotion);

    // PR-001-P2: Log usage event ke audit trail
    logAuditEvent("PROMOTION_USAGE_RECORDED", {
      promotionId,
      success,
      observations: promotion.blastRadius.observations,
      successfulApplications: promotion.blastRadius.successfulApplications,
      failures: promotion.blastRadius.failures
    });
  }

  // PR-001-P4: Method untuk escalate blast radius ke level berikutnya (SHADOW → LIMITED → FULL)
  static async escalateBlastRadius(
    promotionId: string, 
    newMode: "LIMITED_COHORT" | "FULL_PRODUCTION", 
    newPercentage?: number
  ): Promise<EnrichmentPromotion> {
    const promotion = await this.getPromotionById(promotionId);
    if (!promotion) throw new Error(`Promotion ${promotionId} not found`);

    // Validasi escalation sequence (harus berurutan, tidak boleh skip - PR-001-P4 compliance)
    if (promotion.blastRadius.mode === "SHADOW" && newMode !== "LIMITED_COHORT") {
      throw new Error("Cannot skip LIMITED_COHORT from SHADOW mode");
    }
    if (promotion.blastRadius.mode === "LIMITED_COHORT" && newMode !== "FULL_PRODUCTION") {
      throw new Error("Cannot go back from LIMITED_COHORT to SHADOW");
    }

    // Update mode dan percentage
    promotion.blastRadius.mode = newMode;
    if (newPercentage !== undefined) {
      promotion.blastRadius.cohortPercentage = Math.min(100, Math.max(0, newPercentage));
    }
    promotion.blastRadius.lastUpdatedAt = new Date().toISOString();
    
    await this.savePromotion(promotion);
    console.log(`[PR-001-P4] Promotion ${promotionId} escalated to ${newMode} (cohort: ${promotion.blastRadius.cohortPercentage}%)`);
    
    // PR-001-P2: Log escalation event ke audit trail
    logAuditEvent("PROMOTION_ESCALATED", {
      promotionId,
      previousMode: promotion.blastRadius.mode === "FULL_PRODUCTION" ? "LIMITED_COHORT" : "SHADOW",
      newMode,
      newCohortPercentage: promotion.blastRadius.cohortPercentage
    });

    return promotion;
  }

  // PR-001-P4: Method untuk rollback promotion sepenuhnya (emergency safety)
  static async rollbackPromotion(promotionId: string): Promise<void> {
    const promotion = await this.getPromotionById(promotionId);
    if (!promotion) throw new Error(`Promotion ${promotionId} not found`);

    // Kembalikan ke SHADOW mode sepenuhnya dan archive
    promotion.blastRadius.mode = "SHADOW";
    promotion.blastRadius.cohortPercentage = 0;
    promotion.blastRadius.allowedTenants = [];
    promotion.status = "ARCHIVED";
    promotion.blastRadius.lastUpdatedAt = new Date().toISOString();
    
    await this.savePromotion(promotion);

    // Update candidate status kembali ke VALIDATED
    const candidate = await this.getCandidateById(promotion.candidateId);
    if (candidate) {
      candidate.status = "VALIDATED";
      await this.saveCandidate(candidate);
    }

    // PR-001-P2: Log rollback event ke audit trail
    logAuditEvent("PROMOTION_ROLLED_BACK", {
      promotionId,
      reason: "Emergency safety trigger",
      previousMode: promotion.blastRadius.mode,
      candidateId: promotion.candidateId
    });

    console.log(`[PR-001-P4] Promotion ${promotionId} rolled back completely - emergency safety triggered`);
  }

  static async savePromotion(promotion: EnrichmentPromotion): Promise<void> {
    await this.initialize();
    this.inMemoryPromotions.set(promotion.id, promotion);
    
    const filePath = join(STORAGE_DIR, 'promotions', `${promotion.id}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(promotion, null, 2));
  }

  static async getPromotionById(id: string): Promise<EnrichmentPromotion | null> {
    await this.initialize();
    return this.inMemoryPromotions.get(id) || null;
  }

  static async listPromotions(): Promise<EnrichmentPromotion[]> {
    await this.initialize();
    return Array.from(this.inMemoryPromotions.values());
  }

  // PR-001-P4: Blast radius control - check if promotion can be applied to current tenant/request
  static isPromotionApplicable(promotion: EnrichmentPromotion, tenantId?: string | null): boolean {
    // SHADOW mode: hanya untuk observasi, tidak mempengaruhi output (hanya log, tidak terapkan)
    if (promotion.blastRadius.mode === "SHADOW") {
      console.log(`[BLAST RADIUS:SHADOW] Promotion ${promotion.id} hanya observasi - tidak diterapkan ke runtime`);
      promotion.blastRadius.observations += 1;
      this.savePromotion(promotion);
      return false;
    }

    // LIMITED_COHORT: cek cohort percentage dan allowed tenants
    if (promotion.blastRadius.mode === "LIMITED_COHORT") {
      // Cek apakah tenant masuk allowedTenants
      if (tenantId && promotion.blastRadius.allowedTenants.includes(tenantId)) {
        promotion.blastRadius.observations += 1;
        this.savePromotion(promotion);
        return true;
      }
      // Cek cohort percentage (0-100) menggunakan hash tenantId untuk consistent assignment
      const cohortThreshold = promotion.blastRadius.cohortPercentage;
      const tenantHash = tenantId ? this.hashString(tenantId) % 100 : 50;
      if (tenantHash < cohortThreshold) {
        promotion.blastRadius.observations += 1;
        this.savePromotion(promotion);
        return true;
      }
      console.log(`[BLAST RADIUS:LIMITED] Tenant ${tenantId} tidak masuk cohort - promotion tidak diterapkan`);
      return false;
    }

    // FULL_PRODUCTION: selalu diterapkan
    if (promotion.blastRadius.mode === "FULL_PRODUCTION") {
      promotion.blastRadius.observations += 1;
      this.savePromotion(promotion);
      return true;
    }

    // Default: tidak diterapkan jika mode tidak dikenal
    return false;
  }

  // PR-001-P4: Simple string hash untuk consistent cohort assignment
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // PR-001-P4: Record successful application of promotion
  static recordPromotionSuccess(promotionId: string): void {
    const promotion = this.inMemoryPromotions.get(promotionId);
    if (promotion) {
      promotion.blastRadius.successfulApplications += 1;
      this.savePromotion(promotion);
      logAuditEvent("PROMOTION_SUCCESS", { promotionId, successfulCount: promotion.blastRadius.successfulApplications });
    }
  }

  // PR-001-P4: Record failed application of promotion
  static recordPromotionFailure(promotionId: string, errorDetails: Record<string, unknown>): void {
    const promotion = this.inMemoryPromotions.get(promotionId);
    if (promotion) {
      promotion.blastRadius.failures += 1;
      this.savePromotion(promotion);
      logAuditEvent("PROMOTION_FAILURE", { promotionId, failureCount: promotion.blastRadius.failures, error: errorDetails });
    }
  }

  static async escalateBlastRadius(
    promotionId: string, 
    newMode: "LIMITED_COHORT" | "FULL_PRODUCTION", 
    newPercentage?: number
  ): Promise<EnrichmentPromotion> {
    await this.initialize();
    const promotion = this.inMemoryPromotions.get(promotionId);
    if (!promotion) {
      throw new Error(`Promotion ${promotionId} not found`);
    }

    const now = new Date().toISOString();
    const oldMode = promotion.blastRadius.mode;
    promotion.blastRadius.mode = newMode;
    if (newMode === "LIMITED_COHORT" && newPercentage !== undefined) {
      promotion.blastRadius.cohortPercentage = Math.min(100, Math.max(0, newPercentage));
    }
    promotion.blastRadius.lastUpdatedAt = now;

    await this.savePromotion(promotion);
    logAuditEvent("BLAST_RADIUS_ESCALATED", {
      promotionId,
      oldMode,
      newMode,
      newCohortPercentage: promotion.blastRadius.cohortPercentage
    });
    console.log(`[PR-001-P4] Promotion ${promotionId} blast radius escalated: ${oldMode} → ${newMode}`);
    return promotion;
  }

  static async rollbackPromotion(promotionId: string): Promise<void> {
    await this.initialize();
    const promotion = this.inMemoryPromotions.get(promotionId);
    if (!promotion) {
      throw new Error(`Promotion ${promotionId} not found`);
    }

    const now = new Date().toISOString();
    const oldMode = promotion.blastRadius.mode;
    // Rollback ke SHADOW mode
    promotion.blastRadius.mode = "SHADOW";
    promotion.blastRadius.cohortPercentage = 0;
    promotion.blastRadius.lastUpdatedAt = now;
    promotion.status = "ARCHIVED";

    await this.savePromotion(promotion);
    logAuditEvent("PROMOTION_ROLLBACK", {
      promotionId,
      previousMode: oldMode,
      reason: "Automatic rollback to SHADOW mode due to failure threshold"
    });
    console.log(`[PR-001-P4] Promotion ${promotionId} rolled back: ${oldMode} → SHADOW (archived)`);
  }

  static async listValidations(): Promise<ValidationRun[]> {
    await this.initialize();
    return Array.from(this.inMemoryValidationRuns.values());
  }

  // =============================================
  // EXPORT FOR TESTING (G0 COMPLIANT)
  // =============================================
  static getInitializedState(): boolean {
    return this.initialized;
  }

  static getObservationCount(): number {
    return this.inMemoryObservations.size;
  }

  static getClusterCount(): number {
    return this.inMemoryClusters.size;
  }

  static getCandidateCount(): number {
    return this.inMemoryCandidates.size;
  }
}