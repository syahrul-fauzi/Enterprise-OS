import { describe, it, assert, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Canonical Work ID untuk LH-CASE-001 (fixed, immutable)
const canonicalWorkId = 'lh-case-001';
const tenantId = 'test-tenant-lawyershub';
const workspaceId = 'test-workspace-lawyershub';

// Interface WorkEvent sesuai dengan model EOS
interface WorkEvent {
  eventId: string;
  actor: {
    actorId: string;
    actorType: 'human' | 'agent' | 'machine' | 'iot' | 'm2m' | 'external_system';
    actorName: string;
  };
  action: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// Interface WorkEvidence sesuai dengan model EOS
interface WorkEvidence {
  evidenceId: string;
  eventId: string;
  actorId: string;
  contentType: string;
  contentHash: string;
  timestamp: string;
}

// Interface Work (core model yang diharapkan oleh test)
interface Work {
  id: string;
  tenantId: string;
  workspaceId: string;
  currentState: string;
  events: WorkEvent[];
  evidence: WorkEvidence[];
}

describe('LH-CASE-001: Layer D - Actor Runtime Verification (ERA-001)', () => {
  // Setup artifacts directory sebelum test berjalan
  beforeAll(() => {
    const artifactsDir = path.join('./artifacts/lh-case-001/actor-runtime');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    console.log('[SETUP] ✓ Artifacts directory siap untuk Layer D test');
  });

  // Test D1: Canonical work dapat diakses oleh semua actor
  it('D1: Canonical work LH-CASE-001 dapat diakses dan terverifikasi', async () => {
    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}`, {
      headers: { 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId }
    });

    assert.ok(response.ok, 'Berhasil mengakses canonical work LH-CASE-001');
    const work = await response.json() as Work;
    
    assert.strictEqual(work.id, canonicalWorkId, 'Work ID sesuai canonical LH-CASE-001');
    assert.strictEqual(work.tenantId, tenantId, 'Tenant ID sesuai LawyersHub');
    assert.strictEqual(work.workspaceId, workspaceId, 'Workspace ID sesuai LawyersHub');
    
    // Simpan initial state sebagai artifact
    fs.writeFileSync('./artifacts/lh-case-001/actor-runtime/initial-state.json', JSON.stringify(work, null, 2));
    console.log('[D1] ✓ CANONICAL WORK TERBENARKAN - EOS tidak kehilangan canonical authority');
  });

  // Test D2: Human actor dapat berinteraksi
  it('D2: Human actor dapat berinteraksi dengan Work', async () => {
    const humanEvent = {
      command: 'record_event',
      actor: {
        actorId: 'human-lawyer-001',
        actorType: 'human',
        actorName: 'John Lawyer'
      },
      action: 'review_document',
      metadata: { documentId: 'doc-001', action: 'review' }
    };

    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
      body: JSON.stringify(humanEvent)
    });

    assert.ok(response.ok, 'Human actor berhasil mengirim event ke Work');
    const result = await response.json();
    assert.ok(result.eventId, 'Event berhasil dicatat dengan ID yang valid');
    
    console.log('[D2] ✓ HUMAN ACTOR BERHASIL BERINTERAKSI');
  });

  // Test D3: Agent actor dapat berinteraksi
  it('D3: Agent actor dapat berinteraksi dengan Work', async () => {
    const agentEvent = {
      command: 'record_event',
      actor: {
        actorId: 'agent-eos-001',
        actorType: 'agent',
        actorName: 'EOS Assistant'
      },
      action: 'extract_metadata',
      metadata: { documentId: 'doc-001', fieldsExtracted: 12 }
    };

    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
      body: JSON.stringify(agentEvent)
    });

    assert.ok(response.ok, 'Agent actor berhasil mengirim event ke Work');
    const result = await response.json();
    assert.ok(result.eventId, 'Event agent berhasil dicatat');
    
    console.log('[D3] ✓ AGENT ACTOR BERHASIL BERINTERAKSI');
  });

  // Test D4: Machine actor dapat berinteraksi
  it('D4: Machine actor dapat berinteraksi dengan Work', async () => {
    const machineEvent = {
      command: 'record_event',
      actor: {
        actorId: 'machine-processor-001',
        actorType: 'machine',
        actorName: 'Document Processor VM'
      },
      action: 'process_ocr',
      metadata: { documentId: 'doc-001', ocrConfidence: 0.98, pagesProcessed: 5 }
    };

    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
      body: JSON.stringify(machineEvent)
    });

    assert.ok(response.ok, 'Machine actor berhasil mengirim event ke Work');
    const result = await response.json();
    assert.ok(result.eventId, 'Event machine berhasil dicatat');
    
    console.log('[D4] ✓ MACHINE ACTOR BERHASIL BERINTERAKSI');
  });

  // Test D5: IoT actor dapat berinteraksi
  it('D5: IoT actor dapat berinteraksi dengan Work', async () => {
    const iotEvent = {
      command: 'record_event',
      actor: {
        actorId: 'iot-scanner-001',
        actorType: 'iot',
        actorName: 'Office Scanner #7'
      },
      action: 'scan_document',
      metadata: { deviceId: 'scanner-007', resolution: '300dpi', fileSize: '2.4MB' }
    };

    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
      body: JSON.stringify(iotEvent)
    });

    assert.ok(response.ok, 'IoT actor berhasil mengirim event ke Work');
    const result = await response.json();
    assert.ok(result.eventId, 'Event IoT berhasil dicatat');
    
    console.log('[D5] ✓ IOT ACTOR BERHASIL BERINTERAKSI');
  });

  // Test D6: M2M actor dapat berinteraksi
  it('D6: M2M actor dapat berinteraksi dengan Work', async () => {
    const m2mEvent = {
      command: 'record_event',
      actor: {
        actorId: 'm2m-storage-001',
        actorType: 'm2m',
        actorName: 'Cloud Storage Replica'
      },
      action: 'replicate_blob',
      metadata: { region: 'ap-southeast-1', replicationStatus: 'complete', blobHash: 'sha256:abc123' }
    };

    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
      body: JSON.stringify(m2mEvent)
    });

    assert.ok(response.ok, 'M2M actor berhasil mengirim event ke Work');
    const result = await response.json();
    assert.ok(result.eventId, 'Event M2M berhasil dicatat');
    
    console.log('[D6] ✓ M2M ACTOR BERHASIL BERINTERAKSI');
  });

  // Test D7: External System actor dapat berinteraksi
  it('D7: External System actor dapat berinteraksi dengan Work', async () => {
    const externalEvent = {
      command: 'record_event',
      actor: {
        actorId: 'ext-government-001',
        actorType: 'external_system',
        actorName: 'Kemenkumham API Gateway'
      },
      action: 'validate_case_number',
      metadata: { caseNumberValid: true, jurisdiction: 'ID-JB', validationTimestamp: new Date().toISOString() }
    };

    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
      body: JSON.stringify(externalEvent)
    });

    assert.ok(response.ok, 'External System actor berhasil mengirim event ke Work');
    const result = await response.json();
    assert.ok(result.eventId, 'Event external system berhasil dicatat');
    
    console.log('[D7] ✓ EXTERNAL SYSTEM ACTOR BERHASIL BERINTERAKSI');
  });

  // Test D8: Semua actor event tercatat dan Work tetap konsisten
  it('D8: Canonical Work tetap konsisten setelah semua actor berinteraksi', async () => {
    // Ambil state terakhir dari Work
    const response = await fetch(`http://localhost:3001/api/work/${canonicalWorkId}`, {
      headers: { 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId }
    });

    assert.ok(response.ok, 'Berhasil mengambil state akhir Work');
    const finalWork = await response.json() as Work;
    
    // Verifikasi Work ID tetap sama
    assert.strictEqual(finalWork.id, canonicalWorkId, 'Work ID tetap LH-CASE-001 setelah semua interaksi');
    
    // Verifikasi semua event tercatat
    assert.ok(finalWork.events?.length >= 6, 'Semua 6 actor event tercatat di Work');
    
    // Verifikasi tidak ada state yang hilang
    const actorTypesPresent = new Set(finalWork.events.map((e: WorkEvent) => e.actor.actorType));
    assert.ok(actorTypesPresent.has('human'), 'Human actor event tercatat');
    assert.ok(actorTypesPresent.has('agent'), 'Agent actor event tercatat');
    assert.ok(actorTypesPresent.has('machine'), 'Machine actor event tercatat');
    assert.ok(actorTypesPresent.has('iot'), 'IoT actor event tercatat');
    assert.ok(actorTypesPresent.has('m2m'), 'M2M actor event tercatat');
    assert.ok(actorTypesPresent.has('external_system'), 'External system event tercatat');
    
    console.log('[D8] ✓ SEMUA ACTOR BERHASIL BERINTERAKSI DENGAN CANONICAL WORK YANG SAMA');
    console.log('[D8] ✓ EOS tidak kehilangan canonical authority');
    
    // Simpan artifact verifikasi
    fs.writeFileSync('./artifacts/lh-case-001/actor-runtime/final-state.json', JSON.stringify(finalWork, null, 2));
    console.log('\n✅ LAYER D (ACTOR RUNTIME) SEMUA KRITERIA LULUS!');
  });
});