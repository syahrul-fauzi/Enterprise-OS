import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "node:fs";
import type { ArtifactNode, ArtifactEdge } from "./artifact-graph.js";
import { resolveWorkspaceRoot } from "./artifact-graph.js";
import path from "path";

// ArtifactGraphPersistence: Minimal file-based persistence layer untuk menyimpan artifact graph secara permanen
// Implementasi ini 100% kompatibel dengan semua Node.js version, tidak butuh dependency tambahan apapun

interface PersistedArtifactGraph {
  graphId: string;
  decisionId: string;
  tenantId: string;
  productId: string;
  generatedAt: string;
  nodes: readonly ArtifactNode[];
  edges: readonly ArtifactEdge[];
}

export class ArtifactGraphPersistence {
  private storageRoot: string;
  private static instance: ArtifactGraphPersistence;

  private constructor(storageRoot: string) {
    this.storageRoot = storageRoot;
    // Pastikan direktori storage ada
    mkdirSync(this.storageRoot, { recursive: true });
  }

  // Singleton pattern untuk memastikan hanya satu instance
  public static getInstance(): ArtifactGraphPersistence {
    if (!ArtifactGraphPersistence.instance) {
      const workspaceRoot = resolveWorkspaceRoot();
      const storageRoot = path.join(workspaceRoot, ".eos-state/proof-ledger/artifacts");
      ArtifactGraphPersistence.instance = new ArtifactGraphPersistence(storageRoot);
    }
    return ArtifactGraphPersistence.instance;
  }

  // Generate safe filename dari decisionId dan tenantId
  private getGraphPath(decisionId: string, tenantId: string): string {
    const safeDecisionId = decisionId.replace(/[^a-zA-Z0-9-]/g, "_");
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-]/g, "_");
    return path.join(this.storageRoot, `${safeTenantId}_${safeDecisionId}.json`);
  }

  // Simpan artifact graph ke filesystem
  public saveArtifactGraph(
    graphId: string,
    decisionId: string,
    tenantId: string,
    productId: string,
    nodes: readonly ArtifactNode[],
    edges: readonly ArtifactEdge[]
  ): void {
    const graphPath = this.getGraphPath(decisionId, tenantId);
    
    const persistedGraph: PersistedArtifactGraph = {
      graphId,
      decisionId,
      tenantId,
      productId,
      generatedAt: new Date().toISOString(),
      nodes,
      edges
    };

    writeFileSync(graphPath, JSON.stringify(persistedGraph, null, 2), "utf8");
  }

  // Muat artifact graph dari filesystem
  public loadArtifactGraph(decisionId: string, tenantId: string): PersistedArtifactGraph | null {
    const graphPath = this.getGraphPath(decisionId, tenantId);
    
    try {
      const content = readFileSync(graphPath, "utf8");
      return JSON.parse(content) as PersistedArtifactGraph;
    } catch (e) {
      // File tidak ada atau error parse
      return null;
    }
  }

  // Hapus artifact graph
  public deleteArtifactGraph(decisionId: string, tenantId: string): void {
    const graphPath = this.getGraphPath(decisionId, tenantId);
    try {
      unlinkSync(graphPath);
    } catch (e) {
      // Ignore jika file tidak ada
    }
  }

  // List semua graph untuk tenant tertentu
  public listTenantGraphs(tenantId: string): Array<{
    graphId: string;
    decisionId: string;
    generatedAt: string;
  }> {
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-]/g, "_");
    const files = readdirSync(this.storageRoot).filter(f => f.startsWith(`${safeTenantId}_`));
    
    return files.map(file => {
      try {
        const content = readFileSync(path.join(this.storageRoot, file), "utf8");
        const graph = JSON.parse(content) as PersistedArtifactGraph;
        return {
          graphId: graph.graphId,
          decisionId: graph.decisionId,
          generatedAt: graph.generatedAt
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean) as Array<{graphId: string; decisionId: string; generatedAt: string}>;
  }
}