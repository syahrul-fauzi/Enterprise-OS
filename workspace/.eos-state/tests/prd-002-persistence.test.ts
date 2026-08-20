import { test } from "node:test";
import assert from "node:assert";
import { ArtifactGraphPersistence } from "../../packages/core/proof-ledger/src/artifact-persistence.js";
import { unlinkSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "path";

// Buat instance persistence secara langsung tanpa singleton untuk test
class TestArtifactGraphPersistence extends ArtifactGraphPersistence {
  constructor() {
    super("/tmp/.eos-state/proof-ledger/test-artifacts");
  }
}

test("PRD-002 TEST-1: File-based persistence layer berfungsi menyimpan dan memuat artifact graph", async () => {
  // Pastikan direktori test ada
  mkdirSync("/tmp/.eos-state/proof-ledger/test-artifacts", { recursive: true });
  
  // Buat instance test
  const persistence = new TestArtifactGraphPersistence();
  console.log("✅ PRD-002: Instance persistence berhasil dibuat");
  
  // Buat sample nodes dan edges
  const testNodes = [
    {
      id: "requirement:prd002-test-001",
      type: "requirement",
      label: "Test Requirement",
      manifest_ref: "test://ref",
      governance_status: "VALID"
    },
    {
      id: "implementation:test-capability",
      type: "implementation",
      label: "Test Implementation",
      manifest_ref: "test://capability",
      governance_status: "VALID"
    }
  ];

  const testEdges = [
    {
      from: "requirement:prd002-test-001",
      to: "implementation:test-capability",
      relation: "implements"
    }
  ];

  // Simpan graph ke storage
  persistence.saveArtifactGraph(
    "graph-prd002-001",
    "decision-w1-prd002",
    "tenant-test-001",
    "product-legal-hub",
    testNodes,
    testEdges
  );
  console.log("✅ PRD-002: Artifact graph berhasil disimpan ke filesystem");

  // Muat graph dari storage
  const loadedGraph = persistence.loadArtifactGraph("decision-w1-prd002", "tenant-test-001");
  assert.ok(loadedGraph !== null, "Graph harus bisa dimuat kembali");
  assert.equal(loadedGraph.nodes.length, 2, "Node count harus sesuai");
  assert.equal(loadedGraph.edges.length, 1, "Edge count harus sesuai");
  assert.equal(loadedGraph.nodes[0].id, testNodes[0].id, "Node ID harus sesuai");
  console.log("✅ PRD-002: Artifact graph berhasil dimuat dari filesystem");

  // List tenant graphs
  const tenantGraphs = persistence.listTenantGraphs("tenant-test-001");
  assert.equal(tenantGraphs.length, 1, "Harus ada 1 graph untuk tenant test");
  console.log("✅ PRD-002: List tenant graphs berhasil");

  // Hapus graph
  persistence.deleteArtifactGraph("decision-w1-prd002", "tenant-test-001");
  const deletedGraph = persistence.loadArtifactGraph("decision-w1-prd002", "tenant-test-001");
  assert.ok(deletedGraph === null, "Graph harus terhapus");
  console.log("✅ PRD-002: Artifact graph berhasil dihapus dari filesystem");

  // Hapus semua file test
  const storagePath = "/tmp/.eos-state/proof-ledger/test-artifacts";
  if (existsSync(storagePath)) {
    const testFiles = readdirSync(storagePath);
    testFiles.forEach(f => unlinkSync(path.join(storagePath, f)));
  }
});