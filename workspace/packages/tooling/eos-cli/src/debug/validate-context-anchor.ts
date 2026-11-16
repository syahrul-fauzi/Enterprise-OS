import { readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
import { z } from 'zod';
import { validateContextAnchorCompliance } from '../runtime-contracts/models/context-anchor.contracts.js';
import { statePath } from '../state.js';

// Reuse existing YAML parsing pattern from eos-cli (matches readYamlRecord implementation)
function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readYamlRecord(path: string): Record<string, unknown> {
  // Handle multiple YAML documents (current-journey.yaml has --- separators)
  const parsed = YAML.parseAllDocuments(readText(path));
  // For current-journey.yaml: find the document that has work_id (the latest journey state)
  for (const doc of parsed.reverse()) {
    const json = doc.toJSON() as unknown;
    if (isPlainObject(json) && 'work_id' in json) {
      return json;
    }
  }
  // Fallback to last document if work_id not found
  const lastDoc = parsed[parsed.length - 1].toJSON() as unknown;
  if (!isPlainObject(lastDoc)) {
    throw new Error(`Expected YAML mapping at ${path}`);
  }
  return lastDoc;
}

// Load Context Anchor contract using existing pattern
const contextAnchor = readYamlRecord(statePath('contracts', 'context-anchor-v1.yaml'));

// Load actual current-journey.yaml as work contract (matches user's EOS journey tracking)
const workContract = readYamlRecord(statePath('current-journey.yaml'));

// Run validation
console.log("🔍 Running Context Anchor and Work Contract validation...\n");
const result = validateContextAnchorCompliance(contextAnchor, workContract);

// Output results
if (result.valid) {
  console.log("✅ VALIDATION PASSED! All compliance checks passed.");
  console.log(`   Compliance Score: ${(result.complianceScore * 100).toFixed(1)}%`);
} else {
  console.log("❌ VALIDATION FAILED! Found the following errors:");
  result.errors.forEach((err, i) => {
    console.log(`   ${i + 1}. ${err}`);
  });
  process.exit(1);
}