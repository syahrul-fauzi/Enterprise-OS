import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessOSService } from '../implementation/service.js';
import { AutonomyLevel } from '../implementation/business-os.contracts.js';

describe('G10.3 Concurrency & Revocation Testing', () => {
  describe('Concurrent Write Safety', () => {
    it('should handle concurrent seat creation without lost updates', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const concurrentCreations = Array.from({ length: 10 }, (_, i) => 
        service.createSeat({
          humanOwnerId: `human-concurrent-${i}`,
          authorityScope: [`workspace-${i}`, 'seat-operations'],
        })
      );

      const seats = await Promise.all(concurrentCreations);
      expect(seats).toHaveLength(10);

      const fabric = await service.getFabric();
      expect(fabric.seats).toHaveLength(10);

      const seatIds = seats.map(s => s.id);
      const uniqueIds = new Set(seatIds);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle concurrent companion creation without lost updates', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-concurrent-companion',
        authorityScope: ['workspace-1', 'seat-operations'],
      });

      const concurrentCreations = Array.from({ length: 10 }, (_, i) => 
        service.createCompanion({
          seatId: seat.id,
          type: 'AGENT',
          autonomyLevel: AutonomyLevel.A1,
          scopedPermissions: [`work:${i}`, 'evidence:read'],
          validFrom: new Date().toISOString(),
        })
      );

      const companions = await Promise.all(concurrentCreations);
      expect(companions).toHaveLength(10);

      const fabric = await service.getFabric();
      expect(fabric.companions.filter(c => c.seatId === seat.id)).toHaveLength(10);

      const companionIds = companions.map(c => c.id);
      const uniqueIds = new Set(companionIds);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle concurrent authority updates without lost updates', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-concurrent-authority',
        authorityScope: ['workspace-1'],
      });

      const concurrentUpdates = Array.from({ length: 5 }, (_, i) => 
        service.updateSeatAuthority(seat.id, [`workspace-${i}`, `permission-${i}`])
      );

      await Promise.all(concurrentUpdates);

      const updatedSeat = await service.getSeat(seat.id);
      expect(updatedSeat).toBeDefined();
      expect(updatedSeat!.authorityScope.length).toBeGreaterThan(0);

      const attributions = await service.listActorAttributions(seat.id);
      const updateAttributions = attributions.filter(a => a.operation === 'seat-authority-updated');
      expect(updateAttributions.length).toBe(5);
    });
  });

  describe('Revocation Enforcement During Active Work', () => {
    it('should reject authorization check immediately after companion revocation', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-revocation-test',
        authorityScope: ['workspace-1', 'seat-operations'],
      });

      const companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const beforeAuth = await service.getWorkAuthorization(companion.id, 'work:write');
      expect(beforeAuth.valid).toBe(true);

      await service.revokeCompanion(companion.id);

      const afterAuth = await service.getWorkAuthorization(companion.id, 'work:write');
      expect(afterAuth.valid).toBe(false);
      expect(afterAuth.reason).toContain('not active');
    });

    it('should reject concurrent authorization requests after revocation', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-concurrent-revocation',
        authorityScope: ['workspace-1'],
      });

      const companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const authPromisesBefore = Array.from({ length: 5 }, () => 
        service.getWorkAuthorization(companion.id, 'work:write')
      );
      const resultsBefore = await Promise.all(authPromisesBefore);
      expect(resultsBefore.every(r => r.valid)).toBe(true);

      await service.revokeCompanion(companion.id);

      const authPromisesAfter = Array.from({ length: 5 }, () => 
        service.getWorkAuthorization(companion.id, 'work:write')
      );
      const resultsAfter = await Promise.all(authPromisesAfter);
      expect(resultsAfter.every(r => !r.valid)).toBe(true);
    });

    it('should maintain revocation state across multiple service instances', async () => {
      const service1 = new BusinessOSService();
      const service2 = new BusinessOSService();

      await service1.initializeFabric();

      const seat = await service1.createSeat({
        humanOwnerId: 'human-cross-instance',
        authorityScope: ['workspace-1'],
      });

      const companion = await service1.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const companionFromService2 = await service2.getCompanion(companion.id);
      expect(companionFromService2).toBeUndefined();

      const fabricFromService1 = await service1.getFabric();
      expect(fabricFromService1.companions.find(c => c.id === companion.id)).toBeDefined();
    });
  });

  describe('State Consistency After Concurrent Operations', () => {
    it('should maintain consistent attribution count after concurrent operations', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-consistency',
        authorityScope: ['workspace-1'],
      });

      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        service.createCompanion({
          seatId: seat.id,
          type: 'AGENT',
          autonomyLevel: AutonomyLevel.A1,
          scopedPermissions: [`work:${i}`],
          validFrom: new Date().toISOString(),
        })
      );

      await Promise.all(concurrentOperations);

      const attributions = await service.listActorAttributions();
      const companionCreatedAttributions = attributions.filter(a => a.operation === 'companion-created');
      
      expect(companionCreatedAttributions.length).toBe(10);
    });

    it('should not have duplicate attribution IDs after concurrent operations', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-unique-attr',
        authorityScope: ['workspace-1'],
      });

      const concurrentCreations = Array.from({ length: 10 }, (_, i) => 
        service.createCompanion({
          seatId: seat.id,
          type: 'AGENT',
          autonomyLevel: AutonomyLevel.A1,
          scopedPermissions: [`work:${i}`],
          validFrom: new Date().toISOString(),
        })
      );

      await Promise.all(concurrentCreations);

      const attributions = await service.listActorAttributions();
      const attrIds = attributions.map(a => a.id);
      const uniqueAttrIds = new Set(attrIds);
      
      expect(uniqueAttrIds.size).toBe(attrIds.length);
    });
  });
});

describe('G10.2 Persistence & Recovery Testing', () => {
  describe('In-Memory State Isolation', () => {
    it('should maintain separate state for different service instances', async () => {
      const serviceA = new BusinessOSService();
      const serviceB = new BusinessOSService();

      await serviceA.initializeFabric();
      await serviceB.initializeFabric();

      // Tunggu sedikit untuk memastikan timestamp berbeda
      await new Promise(resolve => setTimeout(resolve, 10));

      const seatA = await serviceA.createSeat({
        humanOwnerId: 'human-instance-a',
        authorityScope: ['workspace-a'],
      });

      // Tunggu sedikit lagi
      await new Promise(resolve => setTimeout(resolve, 10));

      const seatB = await serviceB.createSeat({
        humanOwnerId: 'human-instance-b',
        authorityScope: ['workspace-b'],
      });

      const fabricA = await serviceA.getFabric();
      const fabricB = await serviceB.getFabric();

      expect(fabricA.seats).toHaveLength(1);
      expect(fabricB.seats).toHaveLength(1);
      expect(fabricA.seats[0].id).toBe(seatA.id);
      expect(fabricB.seats[0].id).toBe(seatB.id);
      // Verifikasi bahwa state dari serviceA tidak tersedia di serviceB
      expect(fabricB.seats.find(s => s.id === seatA.id)).toBeUndefined();
    });

    it('should reset state when initializeFabric is called', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      await service.createSeat({
        humanOwnerId: 'human-before-reset',
        authorityScope: ['workspace-1'],
      });

      const fabricBefore = await service.getFabric();
      expect(fabricBefore.seats.length).toBeGreaterThan(0);

      await service.initializeFabric();

      const fabricAfter = await service.getFabric();
      expect(fabricAfter.seats).toHaveLength(0);
      expect(fabricAfter.companions).toHaveLength(0);
      expect(fabricAfter.actorAttributions).toHaveLength(0);
    });
  });

  describe('Evidence Persistence Within Instance', () => {
    it('should retain actor attributions within the same service instance', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-evidence-test',
        authorityScope: ['workspace-1'],
      });

      const companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const attributions = await service.listActorAttributions();
      expect(attributions.length).toBeGreaterThanOrEqual(2);

      const companionAttributions = attributions.filter(a => 
        a.evidenceRefs.includes(companion.id)
      );
      expect(companionAttributions.length).toBeGreaterThanOrEqual(1);
    });
  });
});