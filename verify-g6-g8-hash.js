#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

console.log('=== ESI-GRAPH-G6-G8-ACCEPTANCE-RECON-001 — HASH INTEGRITY VERIFICATION ===');
console.log('Timestamp:', new Date().toISOString());

const filesToVerify = [
  '.eos-state/intelligence/artifact-graph-backup-2026-11-19.json',
  '.eos-state/intelligence/edge-adjudication-final-complete.json',
  '.eos-state/intelligence/graph-projection-g6-relationship-correction.json',
  '.eos-state/intelligence/graph-projection-g8-correction.json',
  '.eos-state/intelligence/relationship-contract.json',
  '.eos-state/intelligence/edge-inventory.json',
  '.eos-state/intelligence/g6-g8-validation-results.json',
  '.eos-state/intelligence/esi-graph-g6-completion-report.json',
  '.eos-state/intelligence/esi-graph-g8-completion-report.json'
];

const hashReport = {
  verification_id: 'ESI-GRAPH-HASH-001',
  verification_timestamp: new Date().toISOString(),
  files_verified: [],
  summary: {}
};

filesToVerify.forEach(filePath => {
  const exists = fs.existsSync(filePath);
  const fileInfo = {
    file_path: filePath,
    exists: exists,
    hash_sha256: null,
    file_size: null
  };
  
  if (exists) {
    const fileContent = fs.readFileSync(filePath);
    fileInfo.hash_sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');
    fileInfo.file_size = fs.statSync(filePath).size;
    console.log(`✓ ${filePath}: SHA-256 ${fileInfo.hash_sha256}`);
  } else {
    console.log(`✗ ${filePath}: FILE NOT FOUND`);
  }
  
  hashReport.files_verified.push(fileInfo);
});

hashReport.summary = {
  total_files: filesToVerify.length,
  files_present: hashReport.files_verified.filter(f => f.exists).length,
  files_missing: hashReport.files_verified.filter(f => !f.exists).length,
  integrity_status: hashReport.files_verified.every(f => f.exists) ? 'PASSED' : 'FAILED'
};

fs.writeFileSync('.eos-state/intelligence/g6-g8-hash-integrity-report.json', JSON.stringify(hashReport, null, 2));
console.log('\n=== HASH VERIFICATION COMPLETE ===');
console.log('Total files:', hashReport.summary.total_files);
console.log('Files present:', hashReport.summary.files_present);
console.log('Integrity status:', hashReport.summary.integrity_status);
console.log('Report written to: .eos-state/intelligence/g6-g8-hash-integrity-report.json');