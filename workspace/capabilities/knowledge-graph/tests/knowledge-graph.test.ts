import assert from "node:assert/strict";
import test from "node:test";
import { knowledgeGraphService } from "../implementation/services/knowledge-graph.service.js";

test("knowledge graph builds nodes and edges", () => {
  const snapshot = knowledgeGraphService.getSnapshot();
  assert.ok(snapshot.nodes.length > 0);
  assert.ok(snapshot.edges.length > 0);
});

test("knowledge graph resolves workflow nodes", () => {
  const node = knowledgeGraphService.getNode("workflow:requirement-delivery-readiness");
  assert.ok(node);
  assert.equal(node.type, "workflow");
});
