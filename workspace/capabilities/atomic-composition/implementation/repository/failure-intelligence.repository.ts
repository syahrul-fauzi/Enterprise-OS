// @ts-nocheck
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync, writeFileSync } from 'fs';
import { dirname } from 'path';
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
import { statePath } from '../../../../packages/tooling/eos-cli/src/state.js';

// PR-001-P2: Intelligence Safety Audit Trail Configuration
const AUDIT_CONFIG = {
  LOG_PATH: statePath("failure-intelligence", "logs", "intelligence-audit.log"),
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
    actor: executionContext.get()?.actor_id || "system:unknown-actor",
    tenantId: executionContext.get()?.tenant_id || "unknown-tenant",
    details
  };
  
  const logMessage = JSON.stringify(auditEntry) + '\n';
  console.log(`[AUDIT:${eventType}] ${logMessage.trim()}`);
  writeFileSync(AUDIT_CONFIG.LOG_PATH, logMessage, { flag: 'a' });
}

// Import execution context untuk actor/tenant tracking (PR-001-P2 compliance)
import { executionContext } from '../../../../packages/core/runtime/src/execution-context.js';

// PERSISTENCE LAYER FOR AE-FIC v1 FAILURE INTELLIGENCE
// Stores failure observations and clusters in .eos-state/failure-intelligence for durability
const STORAGE_DIR = statePath("failure-intelligence");

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
    if (this.initialized) {
      console.log("[AE-FIC] initialize: already initialized, skipping (G0 compliant - no recursion)");
      return;
    }
    
    console.log("[AE-FIC] initialize: Production lifecycle started - setting up storage only once");
    
    await mkdir(STORAGE_DIR, { recursive: true });
    await mkdir(statePath("failure-intelligence", 'observations'), { recursive: true });
    await mkdir(statePath("failure-intelligence", 'clusters'), { recursive: true });
    await mkdir(statePath("failure-intelligence", 'candidates'), { recursive: true });
    await mkdir(statePath("failure-intelligence", 'validations'), { recursive: true });
    await mkdir(statePath("failure-intelligence", 'promotions'), { recursive: true });
    
    await this.loadPersistedData();
    
    this.initialized = true;
    console.log("[AE-FIC] initialize: selesai, semua direktori siap, data persisted dimuat");
  }

  static async resetForTesting(): Promise<void> {
    console.log("[AE-FIC] resetForTesting: Test lifecycle - membersihkan semua state");
    this.inMemoryObservations.clear();
    this.inMemoryClusters.clear();
    this.inMemoryCandidates.clear();
    this.inMemoryValidationRuns.clear();
    this.inMemoryPromotions.clear();
    
    await this.cleanupStorage();
    
    this.initialized = false;
    console.log("[AE-FIC] resetForTesting: reset selesai, siap untuk test baru");
  }

  private static async cleanupStorage(): Promise<void> {
    const dirsToClean = [
      statePath("failure-intelligence", 'observations'),
      statePath("failure-intelligence", 'clusters'), 
      statePath("failure-intelligence", 'candidates'),
      statePath("failure-intelligence", 'validations'),
      statePath("failure-intelligence", 'promotions')
    ];
    
    for (const dir of dirsToClean) {
      try {
        if (!existsSync(dir)) {
          console.log(`[DEBUG] cleanupStorage: directory ${dir} belum ada, skip`);
          continue;
        }
        const files = await readdir(dir);
        for (const file of files) {
          console.log(`[DEBUG] cleanupStorage: hapus file lama: ${dir}/${file}`);
          await unlink(statePath("failure-intelligence", dir.split('/').pop() || '', file));
        }
      } catch (e) {
        console.log(`[DEBUG] cleanupStorage: error saat membersihkan ${dir}:`, e);
      }
    }
  }

  private static async loadPersistedData(): Promise<void> {
    if (existsSync(statePath("failure-intelligence", 'observations'))) {
      const files = await readdir(statePath("failure-intelligence", 'observations'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(statePath("failure-intelligence", 'observations', file), 'utf8');
          const obs = JSON.parse(data) as FailureObservation;
          this.inMemoryObservations.set(obs.id, obs);
        }
      }
    }

    if (existsSync(statePath("failure-intelligence", 'clusters'))) {
      const files = await readdir(statePath("failure-intelligence", 'clusters'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(statePath("failure-intelligence", 'clusters', file), 'utf8');
          const cluster = JSON.parse(data) as FailureCluster;
          this.inMemoryClusters.set(cluster.id, cluster);
        }
      }
    }

    if (existsSync(statePath("failure-intelligence", 'candidates'))) {
      const files = await readdir(statePath("failure-intelligence", 'candidates'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(statePath("failure-intelligence", 'candidates', file), 'utf8');
          const candidate = JSON.parse(data) as EnrichmentCandidate;
          this.inMemoryCandidates.set(candidate.id, candidate);
        }
      }
    }

    if (existsSync(statePath("failure-intelligence", 'validations'))) {
      const files = await readdir(statePath("failure-intelligence", 'validations'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(statePath("failure-intelligence", 'validations', file), 'utf8');
          const validationRun = JSON.parse(data) as ValidationRun;
          this.inMemoryValidationRuns.set(validationRun.id, validationRun);
        }
      }
    }
  }

  static async saveObservation(observation: FailureObservation): Promise<{ observationId: string; saved: boolean }> {
    await this.initialize();
    console.log(`[DEBUG] saveObservation: menyimpan ${observation.id}, rootCategory: ${observation.rootCategory}, isUnknown: ${observation.dimensions.isUnknown || false}`);
    this.inMemoryObservations.set(observation.id, observation);
    
    const filePath = statePath("failure-intelligence", 'observations', `${observation.id}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(observation, null, 2));
    console.log(`[DEBUG] saveObservation: disimpan ke disk: ${filePath}`);
    
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
    
    if (filters) {
        if (filters.rootCategory) {
          observations = observations.filter(o => o.rootCategory === filters.rootCategory);
        }
        if (filters.classification) {
          observations = observations.filter(o => o.classification?.startsWith(filters.classification as string));
        }
    }
    
    return observations;
  }

  private static fingerprintsMatch(a: FailureFingerprint, b: FailureFingerprint): boolean {
    console.log(`[DEBUG] fingerprintsMatch: compare a.root=${a.rootCategory}, b.root=${b.rootCategory}`);
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
    
    if (a.semanticOperation === "COMPARE_BUSINESS_ENTITIES" || a.semanticOperation === "INFORMATION_SEEKING" || a.semanticOperation === "USER_CORRECTION") {
      console.log(`[DEBUG] fingerprintsMatch: semanticOperation universal (${a.semanticOperation}), lewati pengecekan entities`);
    } 
    else if (a.entities && b.entities && a.entities.length > 0 && b.entities.length > 0) {
      const overlap = a.entities.some(e => b.entities!.includes(e));
      if (!overlap) {
        console.log(`[DEBUG] fingerprintsMatch: entities tidak ada overlap`);
        return false;
      }
    }
    
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
      if (!matchingCluster.failureIds.includes(observation.id)) {
        matchingCluster.failureIds.push(observation.id);
        matchingCluster.lastObservedAt = now;
        matchingCluster.occurrenceCount += 1;
        console.log(`[DEBUG] clusterObservation: update cluster ${matchingCluster.id}, occurrenceCount sekarang: ${matchingCluster.occurrenceCount}`);
        
        observation.status = "CLUSTERED";
        observation.clusterId = matchingCluster.id;
        
        await this.saveCluster(matchingCluster);
        const filePath = statePath("failure-intelligence", 'observations', `${observation.id}.json`);
        await writeFile(filePath, JSON.stringify(observation, null, 2));
        console.log(`[DEBUG] clusterObservation: cluster dan observation diupdate (G0 compliant - no recursion)`);
        
        if (matchingCluster.occurrenceCount >= 3 && !matchingCluster.enrichmentCandidateId) {
          console.log(`[DEBUG] clusterObservation: threshold 3 tercapai! generate enrichment candidate`);
          await this.generateEnrichmentCandidate(matchingCluster, observation);
        }
      }
    } else {
      console.log(`[DEBUG] clusterObservation: tidak ada matching cluster, buat cluster baru`);
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
      
      observation.status = "CLUSTERED";
      observation.clusterId = newCluster.id;
      
      await this.saveCluster(newCluster);
      const filePath = statePath("failure-intelligence", 'observations', `${observation.id}.json`);
      await writeFile(filePath, JSON.stringify(observation, null, 2));
      console.log(`[DEBUG] clusterObservation: cluster baru dan observation diupdate (G0 compliant - no recursion)`);
    }
  }

  static async saveCluster(cluster: FailureCluster): Promise<{ clusterId: string; saved: boolean }> {
    await this.initialize();
    this.inMemoryClusters.set(cluster.id, cluster);
    
    const filePath = statePath("failure-intelligence", 'clusters', `${cluster.id}.json`);
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
    
    if (filters) {
        if (filters.rootCategory) {
          clusters = clusters.filter(c => c.rootCategory === filters.rootCategory);
        }
        if (filters.minOccurrences) {
          clusters = clusters.filter(c => c.occurrenceCount >= (filters.minOccurrences as number));
        }
    }
    
    return clusters;
  }

  private static extractInvariant(observations: FailureObservation[]): {
    description: string;
    preservedFeatures: string[];
    variableFeatures: string[];
  } {
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

    const preservedFeatures: string[] = [];
    if (semanticOperations.size === 1) {
      preservedFeatures.push('semanticOperation');
    }
    if (rootCategories.size === 1) {
      preservedFeatures.push('rootCategory');
    }

    const variableFeatures: string[] = [];
    if (allEntities.size > 1) {
      variableFeatures.push('entities');
    }
    if (expressions.size > 1) {
      variableFeatures.push('inputExpression');
    }

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

  private static async generateEnrichmentCandidate(cluster: FailureCluster, sourceObservation: FailureObservation): Promise<void> {
    console.log(`[DEBUG] generateEnrichmentCandidate: dimulai untuk cluster ${cluster.id}`);
  }
}