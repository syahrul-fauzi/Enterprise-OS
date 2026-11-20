import { describe, it, expect } from 'vitest';
import { BusinessOSService } from '../implementation/service.js';
import { ArtifactGraphPersistence } from '../../../packages/core/proof-ledger/src/artifact-persistence.js';

describe('G10.2 Persistence & Recovery', () => {
  it('should save fabric state to persistence layer and restore it', async () => {
    const service = new BusinessOSService();
    await service.initializeFabric();

    // 1. Buat state awal
    const seat = await service.createSeat({
      humanOwnerId: 'human-ops-1',
      authorityScope: ['all'],
      seatName: 'Head of Operations'
    });

    const companion = await service.createCompanion({
      seatId: seat.id,
      companionType: 'DOT',
      autonomyLevel: 'A2',
      companionName: 'Operations Dot'
    });

    // 2. Simpan state ke persistence menggunakan mekanisme EOS yang sudah ada
    const fabric = await service.getFabric();
    const persistence = ArtifactGraphPersistence.getInstance();
    
    // Simpan fabric sebagai artifact graph
    persistence.saveArtifactGraph(
      'business-os-fabric-1',
      'business-os-decision-1',
      'tenant-1',
      'product-business-os',
      [
        {
          id: `seat-${seat.id}`,
          type: 'seat',
          data: seat,
          createdAt: new Date().toISOString()
        },
        {
          id: `companion-${companion.id}`,
          type: 'companion',
          data: companion,
          createdAt: new Date().toISOString()
        }
      ],
      [
        {
          from: `seat-${seat.id}`,
          to: `companion-${companion.id}`,
          type: 'owns'
        }
      ]
    );

    // 3. Verifikasi state tersimpan
    const loadedGraph = persistence.loadArtifactGraph('business-os-decision-1', 'tenant-1');
    expect(loadedGraph).not.toBeNull();
    expect(loadedGraph?.nodes.length).toBe(2);
    expect(loadedGraph?.edges.length).toBe(1);

    // 4. Buat instance service baru (simulasi restart proses)
    const newService = new BusinessOSService();
    await newService.initializeFabric();

    // 5. Pulihkan state dari persistence
    if (loadedGraph) {
      // Pulihkan seats
      for (const node of loadedGraph.nodes.filter(n => n.type === 'seat')) {
        await newService.createSeat({
          humanOwnerId: node.data.humanOwnerId,
          authorityScope: node.data.authorityScope,
          seatName: node.data.seatName
        });
      }

      // Pulihkan companions
      const newSeats = await newService.listSeats();
      for (const node of loadedGraph.nodes.filter(n => n.type === 'companion')) {
        const seatForCompanion = newSeats.find(s => s.humanOwnerId === seat.humanOwnerId);
        if (seatForCompanion) {
          await newService.createCompanion({
            seatId: seatForCompanion.id,
            companionType: node.data.companionType,
            autonomyLevel: node.data.autonomyLevel,
            companionName: node.data.companionName
          });
        }
      }
    }

    // 6. Verifikasi state pulih dengan benar
    const restoredFabric = await newService.getFabric();
    expect(restoredFabric.seats.length).toBe(1);
    expect(restoredFabric.companions.length).toBe(1);
    expect(restoredFabric.seats[0].seatName).toBe('Head of Operations');
    expect(restoredFabric.companions[0].companionName).toBe('Operations Dot');
  });

  it('should preserve audit trail after restart', async () => {
    const service = new BusinessOSService();
    await service.initializeFabric();

    // 1. Lakukan beberapa operasi yang mencatat audit trail
    const seat1 = await service.createSeat({
      humanOwnerId: 'human-ops-1',
      authorityScope: ['all'],
      seatName: 'Head of Operations'
    });

    const seat2 = await service.createSeat({
      humanOwnerId: 'human-eng-1',
      authorityScope: ['engineering'],
      seatName: 'Head of Engineering'
    });

    // 2. Dapatkan audit trail
    const fabric = await service.getFabric();
    expect(fabric.actorAttributions.length).toBeGreaterThanOrEqual(2);

    // 3. Simpan audit trail ke persistence
    const persistence = ArtifactGraphPersistence.getInstance();
    persistence.saveArtifactGraph(
      'business-os-audit-1',
      'business-os-audit-decision-1',
      'tenant-1',
      'product-business-os',
      fabric.actorAttributions.map((attr, i) => ({
        id: `attr-${i}`,
        type: 'attribution',
        data: attr,
        createdAt: new Date().toISOString()
      })),
      []
    );

    // 4. Muat kembali audit trail
    const loadedAudit = persistence.loadArtifactGraph('business-os-audit-decision-1', 'tenant-1');
    expect(loadedAudit).not.toBeNull();
    expect(loadedAudit?.nodes.length).toBeGreaterThanOrEqual(2);

    // 5. Verifikasi semua field attribution tersimpan dengan benar
    for (const node of loadedAudit?.nodes || []) {
      expect(node.data.operation).toBeDefined();
      expect(node.data.initiatedBy).toBeDefined();
      expect(node.data.executedBy).toBeDefined();
      expect(node.data.evidenceRefs).toBeDefined();
    }
  });
});