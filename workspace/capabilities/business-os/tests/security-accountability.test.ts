import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessOSService } from '../implementation/service.js';
import { AutonomyLevel } from '../implementation/business-os.contracts.js';

describe('G10.4 Security & Accountability Testing', () => {
  describe('Unauthorized Seat & Access Control', () => {
    it('should reject companion creation for non-existent seat', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      await expect(service.createCompanion({
        seatId: 'non-existent-seat-id',
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      })).rejects.toThrow('Cannot create companion for inactive seat');
    });

    it('should reject authority validation for non-existent companion', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const validation = await service.validateCompanionAuthority('non-existent-companion', 'work:read');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Companion not found');
    });

    it('should reject work authorization for non-existent companion', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const authorization = await service.getWorkAuthorization('non-existent-companion', 'work:write');
      expect(authorization.valid).toBe(false);
      expect(authorization.reason).toContain('Companion not found');
    });

    it('should reject seat authority update for non-existent seat', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const result = await service.updateSeatAuthority('non-existent-seat-id', ['work:*']);
      expect(result).toBeUndefined();
    });
  });

  describe('Expired Delegation & Validity Enforcement', () => {
    it('should reject authorization when companion validity period has expired', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-expired-test',
        authorityScope: ['workspace-1'],
      });

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();

      const expiredCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: twoHoursAgo,
        validUntil: oneHourAgo,
      });

      const validation = await service.validateCompanionAuthority(expiredCompanion.id, 'work:write');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
    });

    it('should reject work authorization for expired companion', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-expired-auth',
        authorityScope: ['workspace-1'],
      });

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();

      const expiredCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: twoHoursAgo,
        validUntil: oneHourAgo,
      });

      const authorization = await service.getWorkAuthorization(expiredCompanion.id, 'work:write');
      expect(authorization.valid).toBe(false);
      expect(authorization.reason).toContain('expired');
    });

    it('should accept authorization for companion within validity period', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-valid-test',
        authorityScope: ['workspace-1'],
      });

      const oneHourFromNow = new Date(Date.now() + 3600000).toISOString();

      const validCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
        validUntil: oneHourFromNow,
      });

      const validation = await service.validateCompanionAuthority(validCompanion.id, 'work:write');
      expect(validation.valid).toBe(true);
    });

    it('should reject authorization when companion validFrom is in the future', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-future-validfrom',
        authorityScope: ['workspace-1'],
      });

      const oneHourFromNow = new Date(Date.now() + 3600000).toISOString();
      const twoHoursFromNow = new Date(Date.now() + 7200000).toISOString();

      const futureCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: oneHourFromNow,
        validUntil: twoHoursFromNow,
      });

      const validation = await service.validateCompanionAuthority(futureCompanion.id, 'work:write');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('has not yet started');
    });
  });

  describe('Autonomy Level Enforcement Boundaries', () => {
    it('should reject companion with autonomy level below required threshold', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-autonomy-test',
        authorityScope: ['workspace-1'],
      });

      const lowAutonomyCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const validation = await service.validateCompanionAuthority(lowAutonomyCompanion.id, 'work:critical', AutonomyLevel.A3);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Insufficient autonomy level');
      expect(validation.autonomyLevel).toBe(AutonomyLevel.A1);
    });

    it('should accept companion with autonomy level equal to required threshold', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-autonomy-equal',
        authorityScope: ['workspace-1'],
      });

      const equalAutonomyCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A3,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const validation = await service.validateCompanionAuthority(equalAutonomyCompanion.id, 'work:critical', AutonomyLevel.A3);
      expect(validation.valid).toBe(true);
    });

    it('should accept companion with autonomy level above required threshold', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-autonomy-above',
        authorityScope: ['workspace-1'],
      });

      const highAutonomyCompanion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A4,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const validation = await service.validateCompanionAuthority(highAutonomyCompanion.id, 'work:critical', AutonomyLevel.A2);
      expect(validation.valid).toBe(true);
    });

    it('should correctly report autonomy level in work authorization response', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-autonomy-report',
        authorityScope: ['workspace-1'],
      });

      const a2Companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const authorization = await service.getWorkAuthorization(a2Companion.id, 'work:write');
      expect(authorization.valid).toBe(true);
      expect(authorization.autonomyLevel).toBe(AutonomyLevel.A2);
    });
  });

  describe('Actor Attribution Field Verification', () => {
    it('should include all required attribution fields for seat creation', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-attribution-test',
        authorityScope: ['workspace-1'],
      });

      const attributions = await service.listActorAttributions();
      const seatCreationAttr = attributions.find(a => a.operation === 'seat-created');

      expect(seatCreationAttr).toBeDefined();
      expect(seatCreationAttr!.id).toBeDefined();
      expect(seatCreationAttr!.operation).toBe('seat-created');
      expect(seatCreationAttr!.timestamp).toBeDefined();
      expect(seatCreationAttr!.initiatedBy).toBeDefined();
      expect(seatCreationAttr!.initiatedBy.type).toBe('HUMAN');
      expect(seatCreationAttr!.initiatedBy.id).toBe('human-attribution-test');
      expect(seatCreationAttr!.executedBy).toBeDefined();
      expect(seatCreationAttr!.executedBy.type).toBe('HUMAN');
      expect(seatCreationAttr!.executedBy.id).toBe('human-attribution-test');
      expect(seatCreationAttr!.evidenceRefs).toBeDefined();
      expect(seatCreationAttr!.evidenceRefs).toContain(seat.id);
    });

    it('should include all required attribution fields for companion creation', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-companion-attr',
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
      const companionCreationAttr = attributions.find(a => a.operation === 'companion-created');

      expect(companionCreationAttr).toBeDefined();
      expect(companionCreationAttr!.id).toBeDefined();
      expect(companionCreationAttr!.operation).toBe('companion-created');
      expect(companionCreationAttr!.timestamp).toBeDefined();
      expect(companionCreationAttr!.initiatedBy).toBeDefined();
      expect(companionCreationAttr!.initiatedBy.type).toBe('HUMAN');
      expect(companionCreationAttr!.delegatedBy).toBeDefined();
      expect(companionCreationAttr!.delegatedBy!.type).toBe('HUMAN');
      expect(companionCreationAttr!.executedBy).toBeDefined();
      expect(companionCreationAttr!.executedBy.type).toBe('HUMAN');
      expect(companionCreationAttr!.evidenceRefs).toBeDefined();
      expect(companionCreationAttr!.evidenceRefs).toContain(companion.id);
      expect(companionCreationAttr!.evidenceRefs).toContain(seat.id);
    });

    it('should include all required attribution fields for seat authority update', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-update-attr',
        authorityScope: ['workspace-1'],
      });

      const newScope = ['workspace-1', 'workspace-2', 'evidence:read'];
      await service.updateSeatAuthority(seat.id, newScope, 'human-update-attr');

      const attributions = await service.listActorAttributions();
      const updateAttr = attributions.find(a => a.operation === 'seat-authority-updated');

      expect(updateAttr).toBeDefined();
      expect(updateAttr!.id).toBeDefined();
      expect(updateAttr!.operation).toBe('seat-authority-updated');
      expect(updateAttr!.timestamp).toBeDefined();
      expect(updateAttr!.initiatedBy).toBeDefined();
      expect(updateAttr!.initiatedBy.id).toBe('human-update-attr');
      expect(updateAttr!.delegatedBy).toBeDefined();
      expect(updateAttr!.delegatedBy!.id).toBe('human-update-attr');
      expect(updateAttr!.executedBy).toBeDefined();
      expect(updateAttr!.executedBy.id).toBe('human-update-attr');
      expect(updateAttr!.evidenceRefs).toBeDefined();
      expect(updateAttr!.evidenceRefs).toContain(seat.id);
    });

    it('should include all required attribution fields for companion revocation', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-revoke-attr',
        authorityScope: ['workspace-1'],
      });

      const companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      await service.revokeCompanion(companion.id, 'human-revoke-attr');

      const attributions = await service.listActorAttributions();
      const revokeAttr = attributions.find(a => a.operation === 'companion-revoked');

      expect(revokeAttr).toBeDefined();
      expect(revokeAttr!.id).toBeDefined();
      expect(revokeAttr!.operation).toBe('companion-revoked');
      expect(revokeAttr!.timestamp).toBeDefined();
      expect(revokeAttr!.initiatedBy).toBeDefined();
      expect(revokeAttr!.initiatedBy.id).toBe('human-revoke-attr');
      expect(revokeAttr!.executedBy).toBeDefined();
      expect(revokeAttr!.executedBy.id).toBe('human-revoke-attr');
      expect(revokeAttr!.evidenceRefs).toBeDefined();
      expect(revokeAttr!.evidenceRefs).toContain(companion.id);
    });

    it('should have unique attribution IDs for all operations', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-unique-attr',
        authorityScope: ['workspace-1'],
      });

      await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      await service.updateSeatAuthority(seat.id, ['work:*']);

      const attributions = await service.listActorAttributions();
      const attrIds = attributions.map(a => a.id);
      const uniqueIds = new Set(attrIds);

      expect(uniqueIds.size).toBe(attrIds.length);
    });
  });

  describe('Evidence Reference Integrity', () => {
    it('should include relevant evidence references in every attribution', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-evidence-refs',
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

      for (const attr of attributions) {
        expect(attr.evidenceRefs).toBeDefined();
        expect(Array.isArray(attr.evidenceRefs)).toBe(true);
        expect(attr.evidenceRefs.length).toBeGreaterThan(0);
      }

      const seatCreationAttr = attributions.find(a => a.operation === 'seat-created');
      expect(seatCreationAttr!.evidenceRefs).toContain(seat.id);

      const companionCreationAttr = attributions.find(a => a.operation === 'companion-created');
      expect(companionCreationAttr!.evidenceRefs).toContain(companion.id);
    });

    it('should maintain evidence chain across multiple operations', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-evidence-chain',
        authorityScope: ['workspace-1'],
      });

      const companion1 = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const companion2 = await service.createCompanion({
        seatId: seat.id,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['read:*'],
        validFrom: new Date().toISOString(),
      });

      await service.revokeCompanion(companion1.id);

      const attributions = await service.listActorAttributions();
      expect(attributions.length).toBeGreaterThanOrEqual(4);

      const allEvidenceRefs = attributions.flatMap(a => a.evidenceRefs);
      expect(allEvidenceRefs).toContain(seat.id);
      expect(allEvidenceRefs).toContain(companion1.id);
      expect(allEvidenceRefs).toContain(companion2.id);
    });

    it('should reject operations when companion is revoked', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-revoked-test',
        authorityScope: ['workspace-1'],
      });

      const companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      await service.revokeCompanion(companion.id, 'human-revoked-test');

      const validation = await service.validateCompanionAuthority(companion.id, 'work:write');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('REVOKED');
    });

    it('should include delegatedBy field for agent-initiated operations', async () => {
      const service = new BusinessOSService();
      await service.initializeFabric();

      const seat = await service.createSeat({
        humanOwnerId: 'human-delegated-test',
        authorityScope: ['workspace-1'],
      });

      const companion = await service.createCompanion({
        seatId: seat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });

      const attributions = await service.listActorAttributions();
      const companionCreationAttr = attributions.find(a => a.operation === 'companion-created');

      expect(companionCreationAttr).toBeDefined();
      expect(companionCreationAttr!.delegatedBy).toBeDefined();
      expect(companionCreationAttr!.delegatedBy!.type).toBe('HUMAN');
      expect(companionCreationAttr!.delegatedBy!.id).toBe('human-delegated-test');
    });
  });
});