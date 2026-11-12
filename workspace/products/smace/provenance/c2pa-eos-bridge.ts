// SMACE-ARCH-005: C2PA-EOS Provenance Bridge - Linkage antara C2PA manifest dengan EOS Evidence Registry
// Tidak membuat sistem bukti kedua, hanya adapter yang menghubungkan C2PA (standar interoperabilitas) dengan Evidence Registry (authority internal)

import { evidenceRegistry } from '../../../capabilities/evidence-registry/implementation/index.js';
import type { CreativeBrief } from '../contracts/creative-brief.contract.js';

// C2PA Manifest structure sesuai standar spec.c2pa.org
export interface C2PAManifest {
  claim_generator: string;
  claim_generator_version: string;
  assertions: C2PAAssertion[];
  signature: string;
  timestamp: string;
}

export interface C2PAAssertion {
  'dc:title': string;
  'c2pa:producer': string;
  'c2pa:created': string;
  'c2pa:action': string;
  'eos:canonicalWorkId': string;
  'eos:actorId': string;
  'eos:evidenceId': string;
}

// Buat C2PA manifest dari EOS evidence
export async function createC2PAManifestFromEOSEvidence(
  brief: CreativeBrief,
  assetPath: string
): Promise<C2PAManifest> {
  // Ambil semua evidence untuk canonicalWorkId dari Evidence Registry
  const workEvidence = await evidenceRegistry.query({
    workId: brief.canonicalWorkId!,
    assetFilter: assetPath
  });

  // Guard clause untuk mencegah error jika workEvidence.records undefined/null (FIX SMACE-001)
  const safeRecords = workEvidence?.records || [];
  // Transformasi EOS evidence menjadi C2PA assertions
  const assertions: C2PAAssertion[] = safeRecords.map(record => ({
    'dc:title': `Asset dari brief ${brief.id}`,
    'c2pa:producer': record.actorId,
    'c2pa:created': record.timestamp,
    'c2pa:action': record.type,
    'eos:canonicalWorkId': record.workId,
    'eos:actorId': record.actorId,
    'eos:evidenceId': record.id
  }));

  // Buat manifest C2PA yang dapat diverifikasi
  const c2paManifest: C2PAManifest = {
    claim_generator: 'SMACE-EOS-C2PA-Bridge/1.0',
    claim_generator_version: '1.0.0',
    assertions,
    signature: '', // Signature akan ditambahkan oleh C2PA library eksternal
    timestamp: new Date().toISOString()
  };

  // Simpan referensi manifest C2PA ke EOS Evidence Registry untuk audit trail
  await evidenceRegistry.record({
    workId: brief.canonicalWorkId!,
    type: 'c2pa.manifest.created',
    actorId: 'smace:provenance:c2pa-bridge',
    payload: {
      assetPath,
      c2paManifestId: `c2pa-${Date.now()}`,
      canonicalWorkId: brief.canonicalWorkId
    },
    timestamp: c2paManifest.timestamp
  });

  return c2paManifest;
}

// Verifikasi C2PA manifest terhadap EOS evidence chain (memastikan integritas)
export async function verifyC2PAManifestAgainstEOSEvidence(
  c2paManifest: C2PAManifest,
  canonicalWorkId: string
): Promise<{ verified: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  // Ambil evidence dari EOS
  const eosEvidence = await evidenceRegistry.query({ workId: canonicalWorkId });
  
  // Verifikasi setiap assertion di C2PA ada di EOS evidence
  c2paManifest.assertions.forEach(assertion => {
    const matchingEvidence = eosEvidence.records.find(r => r.id === assertion['eos:evidenceId']);
    if (!matchingEvidence) {
      issues.push(`Assertion ${assertion['c2pa:action']} tidak ditemukan di EOS evidence chain`);
    } else if (matchingEvidence.timestamp !== assertion['c2pa:created']) {
      issues.push(`Timestamp mismatch untuk evidence ${assertion['eos:evidenceId']}`);
    }
  });

  const verified = issues.length === 0;
  
  // Catat hasil verifikasi ke Evidence Registry
  await evidenceRegistry.record({
    workId: canonicalWorkId,
    type: 'c2pa.manifest.verified',
    actorId: 'smace:provenance:c2pa-bridge',
    payload: { verified, issues },
    timestamp: new Date().toISOString()
  });

  return { verified, issues };
}