const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVIDENCE_DIR = path.join(__dirname, '.eos-state', 'intelligence');
const SOURCE_GRAPH_PATH = path.join(EVIDENCE_DIR, 'artifact-graph-backup-2026-11-19.json');
const EDGE_ADJUDICATION_PATH = path.join(EVIDENCE_DIR, 'edge-adjudication-final-complete.json');
const RELATIONSHIP_CONTRACT_PATH = path.join(EVIDENCE_DIR, 'relationship-contract.json');
const SHADOW_OUTPUT_DIR = path.join(EVIDENCE_DIR, 'shadow-reasoning-results');

const computeHash = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

const loadJson = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const ensureOutputDir = () => {
  if (!fs.existsSync(SHADOW_OUTPUT_DIR)) {
    fs.mkdirSync(SHADOW_OUTPUT_DIR, { recursive: true });
  }
};

class ShadowReasoningEngine {
  constructor() {
    this.sourceGraph = loadJson(SOURCE_GRAPH_PATH);
    this.edgeAdjudication = loadJson(EDGE_ADJUDICATION_PATH);
    this.relationshipContract = loadJson(RELATIONSHIP_CONTRACT_PATH);
    this.originalGraphHash = computeHash(this.sourceGraph);
    this.results = {
      run_timestamp: new Date().toISOString(),
      source_graph_hash: this.originalGraphHash,
      mode: 'READ_ONLY_SHADOW',
      compliant_edges: [],
      non_compliant_edges: [],
      dependency_analysis: [],
      gap_detection: [],
      ambiguity_detection: [],
      insufficient_evidence_flags: [],
      audit_log: []
    };
  }

  isEdgeCompliant(edge) {
    const adjudication = this.edgeAdjudication.edge_adjudications.find(
      adj => adj.edge_id === edge.id
    );
    
    if (!adjudication) {
      console.log(`Edge ${edge.id}: No adjudication record found`);
      return { compliant: false, reason: 'No adjudication record' };
    }

    if (adjudication.adjudication_classification !== 'COMPLIANT') {
      return { compliant: false, reason: `Classification: ${adjudication.adjudication_classification}` };
    }

    const validRelationshipTypes = this.relationshipContract.valid_relationship_types || [];
    if (!validRelationshipTypes.includes(edge.relation)) {
      return { compliant: false, reason: `Invalid relationship type: ${edge.relation}` };
    }

    const requiredFields = ['from', 'to', 'relation', 'id'];
    const missingFields = requiredFields.filter(field => !edge[field]);
    if (missingFields.length > 0) {
      return { compliant: false, reason: `Missing required fields: ${missingFields.join(', ')}` };
    }

    return { compliant: true, reason: 'All compliance checks passed' };
  }

  filterCompliantEdges() {
    this.audit('Filtering compliant edges...');
    
    const allEdges = this.sourceGraph.graph_data.edges || [];
    
    allEdges.forEach((edge, index) => {
      const edgeWithId = { ...edge, id: `E${String(index + 1).padStart(3, '0')}` };
      const complianceCheck = this.isEdgeCompliant(edgeWithId);
      
      if (complianceCheck.compliant) {
        this.results.compliant_edges.push({
          edge_id: edgeWithId.id,
          source_node: edgeWithId.from,
          target_node: edgeWithId.to,
          relationship_type: edgeWithId.relation,
          compliance_reason: complianceCheck.reason
        });
      } else {
        this.results.non_compliant_edges.push({
          edge_id: edgeWithId.id,
          source_node: edgeWithId.from,
          target_node: edgeWithId.to,
          relationship_type: edgeWithId.relation,
          non_compliance_reason: complianceCheck.reason
        });
      }
    });

    this.audit(`Found ${this.results.compliant_edges.length} compliant edges, ${this.results.non_compliant_edges.length} non-compliant edges`);
  }

  analyzeDependencies() {
    this.audit('Running dependency analysis on compliant edges...');
    
    if (this.results.compliant_edges.length === 0) {
      this.results.insufficient_evidence_flags.push({
        type: 'NO_COMPLIANT_EDGES',
        message: 'Cannot perform dependency analysis - 0 compliant edges available',
        evidence_count: 0
      });
      this.audit('Insufficient evidence for dependency analysis - 0 compliant edges');
      return;
    }

    this.results.compliant_edges.forEach(edge => {
      this.results.dependency_analysis.push({
        source_node: edge.source_node,
        target_node: edge.target_node,
        relationship_type: edge.relationship_type,
        confidence: 1.0,
        evidence_references: [edge.edge_id],
        reasoning_mode: 'SHADOW_DEPENDENCY'
      });
    });

    this.audit(`Generated ${this.results.dependency_analysis.length} dependency relationships`);
  }

  detectGaps() {
    this.audit('Running gap detection...');
    
    const allNodes = this.sourceGraph.graph_data.nodes || [];
    const nodeIds = new Set(allNodes.map(n => n.id));
    
    const edgeSourceIds = new Set(this.sourceGraph.graph_data.edges.map(e => e.from));
    const edgeTargetIds = new Set(this.sourceGraph.graph_data.edges.map(e => e.to));
    
    const isolatedNodes = [...nodeIds].filter(id => !edgeSourceIds.has(id) && !edgeTargetIds.has(id));
    
    isolatedNodes.forEach(nodeId => {
      this.results.gap_detection.push({
        node_id: nodeId,
        gap_type: 'ISOLATED_NODE',
        message: 'Node has no connected edges',
        evidence_references: []
      });
    });

    this.audit(`Detected ${this.results.gap_detection.length} potential gaps`);
  }

  detectAmbiguity() {
    this.audit('Running ambiguity detection...');
    
    const relationshipCounts = {};
    
    (this.sourceGraph.graph_data.edges || []).forEach(edge => {
      const key = `${edge.from}-${edge.to}`;
      if (!relationshipCounts[key]) {
        relationshipCounts[key] = [];
      }
      relationshipCounts[key].push(edge.relation);
    });

    Object.entries(relationshipCounts).forEach(([key, types]) => {
      if (new Set(types).size > 1) {
        const [source, target] = key.split('-');
        this.results.ambiguity_detection.push({
          source_node: source,
          target_node: target,
          ambiguity_type: 'MULTIPLE_RELATIONSHIP_TYPES',
          relationship_types: types,
          message: 'Multiple relationship types between same node pair'
        });
      }
    });

    this.audit(`Detected ${this.results.ambiguity_detection.length} ambiguous relationships`);
  }

  verifyGraphIntegrity() {
    const currentHash = computeHash(this.sourceGraph);
    if (currentHash !== this.originalGraphHash) {
      throw new Error('Graph integrity check failed - source graph was modified during reasoning!');
    }
    this.audit('Graph integrity verified - no modifications detected');
  }

  audit(message) {
    const timestamp = new Date().toISOString();
    this.results.audit_log.push({ timestamp, message });
    console.log(`[${timestamp}] ${message}`);
  }

  run() {
    this.audit('Starting shadow reasoning engine in READ-ONLY mode...');
    
    this.filterCompliantEdges();
    this.analyzeDependencies();
    this.detectGaps();
    this.detectAmbiguity();
    this.verifyGraphIntegrity();
    
    this.results.final_status = 'COMPLETED';
    this.results.graph_integrity_verified = true;
    
    this.saveResults();
    
    this.audit('Shadow reasoning run completed successfully');
    return this.results;
  }

  saveResults() {
    ensureOutputDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(SHADOW_OUTPUT_DIR, `shadow-reasoning-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    this.audit(`Results saved to: ${outputPath}`);
  }
}

const runShadowReasoning = () => {
  const engine = new ShadowReasoningEngine();
  return engine.run();
};

runShadowReasoning();