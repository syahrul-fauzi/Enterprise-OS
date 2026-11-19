#!/usr/bin/env node
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('.eos-state/intelligence/artifact-graph-backup-2026-11-19.json', 'utf8'));
const edges = backup.graph_data.edges;

console.log('Checking edge relations...');
edges.forEach((edge, idx) => {
  if (idx >= 35) {
    console.log(`Edge ${idx}: relation='${edge.relation}' type=${typeof edge.relation}`);
  }
});