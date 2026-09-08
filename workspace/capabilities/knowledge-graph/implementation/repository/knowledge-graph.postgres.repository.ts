// PostgreSQL-backed knowledge graph repository implementation
// Implements PostgresRepository pattern for knowledge_graph_nodes and knowledge_graph_edges tables
// Follows existing patterns from case-postgres.repository.ts and communication.postgres.repository.ts
import { Pool } from "pg";
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import { DatabaseMigrationManager } from "../../../shared/implementation/database/migrations/migration.manager.js";
import type { KnowledgeNode, KnowledgeEdge, KnowledgeGraphRepository } from "../contracts/knowledge-graph.contracts.js";

// Validate required environment variables in production - matches existing repository pattern
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
if (process.env.NODE_ENV === "production" && !isBuildPhase && !process.env.POSTGRES_CONNECTION_STRING) {
  throw new Error("[KnowledgeGraphRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING environment variable is required in production");
}

// Initialize connection pools - matches read/write pool pattern from other repositories
const writePool = new Pool({
  connectionString: process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_identity",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readPool = new Pool({
  connectionString: process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_identity",
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Run migrations on initialization - ensures knowledge graph tables exist
let migrationsInitialized = false;
async function initializeDatabase() {
  if (migrationsInitialized) return;
  const result = await DatabaseMigrationManager.runMigrations(writePool);
  if (result.errors.length > 0) {
    console.error("[KnowledgeGraphRepositoryPostgres] Database initialization failed:", result.errors);
    throw new Error(`Database migration failed: ${result.errors.join(", ")}`);
  }
  console.log(`[KnowledgeGraphRepositoryPostgres] Database initialized: ${result.executed.length} migrations executed, ${result.already_applied.length} already applied`);
  migrationsInitialized = true;
}

// Knowledge Node Repository - implements PostgresRepository for knowledge_graph_nodes
class KnowledgeNodeRepositoryPostgresImpl extends PostgresRepository<KnowledgeNode & { id: string; tenantId: string; workspaceId: string }> {
  readonly entityName = "KnowledgeNode" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("knowledge_graph_nodes");
  }

  /**
   * Expose both pools for health checking and monitoring
   * Used by Kubernetes liveness/readiness probes - matches all other repository patterns
   */
  getPools(): {write: Pool; read: Pool} {
    return { write: writePool, read: readPool };
  }
  
  /**
   * Backward compatibility for health check system
   * @deprecated Use getPools() instead
   */
  getPool(): Pool {
    return writePool;
  }

  /**
   * Convert domain aggregate (KnowledgeNode) to database record (camelCase → snake_case)
   * Implements abstract toRecord method from PostgresRepository base class
   */
  protected toRecord(entity: KnowledgeNode & { id: string; tenantId: string; workspaceId: string; version?: number }): Record<string, any> {
    return {
      id: entity.id,
      type: entity.type,
      name: entity.label,
      description: null,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      properties: entity.attributes,
      metadata: entity.metadata || null,
      version: entity.version || 1
    };
  }

  /**
   * Convert database record to domain aggregate (snake_case → camelCase)
   * Implements abstract toAggregate method from PostgresRepository base class
   */
  protected toAggregate(record: Record<string, any>): KnowledgeNode & { id: string; tenantId: string; workspaceId: string } {
    return {
      id: record.id,
      type: record.type,
      label: record.name,
      attributes: record.properties || {},
      metadata: record.metadata || undefined,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id
    };
  }

  /**
   * Override save() to set RLS session context before database operation
   * Ensures tenant isolation is enforced for all knowledge node writes
   */
  async save(entity: KnowledgeNode & { id: string; tenantId: string; workspaceId: string; version?: number }): Promise<KnowledgeNode & { id: string; tenantId: string; workspaceId: string; }> {
    await this.setSessionContext(entity.tenantId, entity.workspaceId);
    const result = await super.save(entity);
    await this.clearSessionContext();
    return result;
  }

  /**
   * Get all nodes for a specific tenant/workspace
   * Adds RLS context to list() operation
   */
  async listForTenant(tenantId: string, workspaceId: string): Promise<readonly (KnowledgeNode & { id: string })[]> {
    await this.setSessionContext(tenantId, workspaceId);
    const nodes = await this.list();
    await this.clearSessionContext();
    return nodes;
  }
}

// Knowledge Edge Repository - implements PostgresRepository for knowledge_graph_edges
class KnowledgeEdgeRepositoryPostgresImpl extends PostgresRepository<KnowledgeEdge & { id: string; tenantId: string; workspaceId: string }> {
  readonly entityName = "KnowledgeEdge" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("knowledge_graph_edges");
    // Database already initialized by node repository, migrations run once
  }

  /**
   * Convert domain aggregate (KnowledgeEdge) to database record (camelCase → snake_case)
   */
  protected toRecord(entity: KnowledgeEdge & { id: string; tenantId: string; workspaceId: string; version?: number }): Record<string, any> {
    return {
      id: entity.id,
      type: entity.relation,
      source_node_id: entity.from,
      target_node_id: entity.to,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      properties: {},
      metadata: entity.metadata || null,
      version: entity.version || 1
    };
  }

  /**
   * Convert database record to domain aggregate (snake_case → camelCase)
   */
  protected toAggregate(record: Record<string, any>): KnowledgeEdge & { id: string; tenantId: string; workspaceId: string } {
    return {
      id: record.id,
      from: record.source_node_id,
      to: record.target_node_id,
      relation: record.type,
      metadata: record.metadata || undefined,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id
    };
  }

  /**
   * Override save() to set RLS session context before database operation
   */
  async save(entity: KnowledgeEdge & { id: string; tenantId: string; workspaceId: string; version?: number }): Promise<KnowledgeEdge & { id: string; tenantId: string; workspaceId: string; }> {
    await this.setSessionContext(entity.tenantId, entity.workspaceId);
    const result = await super.save(entity);
    await this.clearSessionContext();
    return result;
  }

  /**
   * Get all edges for a specific tenant/workspace
   */
  async listForTenant(tenantId: string, workspaceId: string): Promise<readonly (KnowledgeEdge & { id: string })[]> {
    await this.setSessionContext(tenantId, workspaceId);
    const edges = await this.list();
    await this.clearSessionContext();
    return edges;
  }
}

// Singleton instances - follow existing repository singleton pattern
let nodeRepositoryInstance: KnowledgeNodeRepositoryPostgresImpl | null = null;
let edgeRepositoryInstance: KnowledgeEdgeRepositoryPostgresImpl | null = null;

export function getKnowledgeNodeRepositoryPostgres(): KnowledgeNodeRepositoryPostgresImpl {
  if (!nodeRepositoryInstance) {
    nodeRepositoryInstance = new KnowledgeNodeRepositoryPostgresImpl();
  }
  return nodeRepositoryInstance;
}

export function getKnowledgeEdgeRepositoryPostgres(): KnowledgeEdgeRepositoryPostgresImpl {
  if (!edgeRepositoryInstance) {
    edgeRepositoryInstance = new KnowledgeEdgeRepositoryPostgresImpl();
  }
  return edgeRepositoryInstance;
}

// Combined knowledge graph repository interface implementation
class KnowledgeGraphRepositoryPostgresImpl implements KnowledgeGraphRepository {
  private nodeRepo = getKnowledgeNodeRepositoryPostgres();
  private edgeRepo = getKnowledgeEdgeRepositoryPostgres();

  /**
   * Save a complete knowledge graph snapshot (nodes + edges) to PostgreSQL
   * Implements atomic persistence of the entire graph state for a tenant/workspace
   */
  async saveSnapshot(
    nodes: (KnowledgeNode & { id: string; tenantId: string; workspaceId: string })[],
    edges: (KnowledgeEdge & { id: string; tenantId: string; workspaceId: string })[]
  ): Promise<{ savedNodes: number; savedEdges: number }> {
    let savedNodes = 0;
    let savedEdges = 0;

    // Save all nodes first (edges depend on nodes existing due to foreign key constraints)
    for (const node of nodes) {
      await this.nodeRepo.save(node);
      savedNodes++;
    }

    // Save all edges after nodes are persisted
    for (const edge of edges) {
      await this.edgeRepo.save(edge);
      savedEdges++;
    }

    return { savedNodes, savedEdges };
  }

  /**
   * Load complete knowledge graph snapshot from PostgreSQL for a tenant/workspace
   */
  async loadSnapshot(tenantId: string, workspaceId: string): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
    const existingNodes = await this.nodeRepo.listForTenant(tenantId, workspaceId);
    const existingEdges = await this.edgeRepo.listForTenant(tenantId, workspaceId);
    // Fix readonly array processing to create mutable node/edge maps
    const mutableNodes = new Map(existingNodes.map(node => [node.id, node]));
    const mutableEdges = new Map(existingEdges.map(edge => [edge.id, edge]));
    const nodes = Array.from(mutableNodes.values());
    const edges = Array.from(mutableEdges.values());
    return { nodes, edges };
  }

  /**
   * Expose pools for health checking - matches pattern from other repositories
   */
  getPools(): { write: Pool; read: Pool } {
    return { write: writePool, read: readPool };
  }
  
  /**
   * Backward compatibility for health check system
   * @deprecated Use getPools() instead
   */
  getPool(): Pool {
    return writePool;
  }
}

// Export singleton instance of combined repository
let knowledgeGraphRepositoryInstance: KnowledgeGraphRepositoryPostgresImpl | null = null;

export function getKnowledgeGraphRepositoryPostgres(): KnowledgeGraphRepositoryPostgresImpl {
  if (!knowledgeGraphRepositoryInstance) {
    knowledgeGraphRepositoryInstance = new KnowledgeGraphRepositoryPostgresImpl();
  }
  return knowledgeGraphRepositoryInstance;
}

// Export types for consumers
export type { KnowledgeGraphRepositoryPostgresImpl };