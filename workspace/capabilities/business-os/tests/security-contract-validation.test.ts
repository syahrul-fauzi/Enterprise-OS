import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessOSService } from '../implementation/service.js';
import { AutonomyLevel } from '../implementation/business-os.contracts.js';

const businessOSService = new BusinessOSService();
let testSeatId: string;
let testCompanionId: string;

describe('Security & Contract Validation', () => {
  beforeEach(async () => {
    await businessOSService.initializeFabric();
    const seat = await businessOSService.createSeat({
      humanOwnerId: 'human-security-test',
      authorityScope: ['workspace-1', 'seat-operations', 'delegation'],
    });
    testSeatId = seat.id;
    
    const companion = await businessOSService.createCompanion({
      seatId: testSeatId,
      type: 'AGENT',
      autonomyLevel: AutonomyLevel.A1,
      scopedPermissions: ['work:*', 'evidence:read'],
      validFrom: new Date().toISOString(),
    });
    testCompanionId = companion.id;
  });

  describe('Delegation Flow Validation', () => {
    it('should create companion with scoped permissions and time-bound validity', async () => {
      const companion = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(), // 1 hari dari sekarang
      });
      
      expect(companion).toBeDefined();
      expect(companion.scopedPermissions).toContain('work:*');
      expect(companion.validFrom).toBeDefined();
      expect(companion.validUntil).toBeDefined();
    });

    it('should enforce seat active requirement before companion creation', async () => {
      const inactiveSeat = await businessOSService.createSeat({
        humanOwnerId: 'human-inactive-test',
        authorityScope: ['workspace-2'],
      });
      
      await businessOSService.suspendSeat(inactiveSeat.id);
      
      await expect(businessOSService.createCompanion({
        seatId: inactiveSeat.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      })).rejects.toThrow('Cannot create companion for inactive seat');
    });
  });

  describe('Authority Validation & Autonomy Level Enforcement', () => {
    it('should reject companion without required permission', async () => {
      const noPermissionCompanion = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['other:*'],
        validFrom: new Date().toISOString(),
      });
      
      const validation = await businessOSService.validateCompanionAuthority(noPermissionCompanion.id, 'work:read');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Missing required permission');
    });

    it('should enforce minimum autonomy level requirement', async () => {
      const lowAutonomyCompanion = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      const validation = await businessOSService.validateCompanionAuthority(lowAutonomyCompanion.id, 'work:write', AutonomyLevel.A3);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Insufficient autonomy level');
    });

    it('should accept companion with sufficient autonomy level', async () => {
      const highAutonomyCompanion = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A3,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      const validation = await businessOSService.validateCompanionAuthority(highAutonomyCompanion.id, 'work:write', AutonomyLevel.A2);
      expect(validation.valid).toBe(true);
    });

    it('should reject companion with expired validity', async () => {
      // Buat companion dengan validUntil yang sudah lewat 1 jam yang lalu
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const expiredCompanion = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date(Date.now() - 7200000).toISOString(), // 2 jam lalu
        validUntil: oneHourAgo, // Sudah kadaluarsa 1 jam lalu
      });
      
      const validation = await businessOSService.validateCompanionAuthority(expiredCompanion.id, 'work:test');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
    });
  });

  describe('Revocation Flow Validation', () => {
    it('should revoke companion and prevent further authority', async () => {
      const companionToRevoke = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      await businessOSService.revokeCompanion(companionToRevoke.id);
      
      const validation = await businessOSService.validateCompanionAuthority(companionToRevoke.id, 'work:read');
      expect(validation.valid).toBe(false);
      expect(validation.companionStatus).toBe('REVOKED');
    });

    it('should automatically revoke all companions when seat is suspended', async () => {
      const seatToSuspend = await businessOSService.createSeat({
        humanOwnerId: 'human-suspend-test',
        authorityScope: ['workspace-3'],
      });
      
      const companion1 = await businessOSService.createCompanion({
        seatId: seatToSuspend.id,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      const companion2 = await businessOSService.createCompanion({
        seatId: seatToSuspend.id,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      await businessOSService.suspendSeat(seatToSuspend.id);
      
      const validation1 = await businessOSService.validateCompanionAuthority(companion1.id, 'work:read');
      const validation2 = await businessOSService.validateCompanionAuthority(companion2.id, 'work:read');
      
      expect(validation1.valid).toBe(false);
      expect(validation2.valid).toBe(false);
    });

    it('should pause and resume companion correctly', async () => {
      const companionToPause = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'SPECIALIST',
        autonomyLevel: AutonomyLevel.A2,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      await businessOSService.pauseCompanion(companionToPause.id);
      
      const pausedValidation = await businessOSService.validateCompanionAuthority(companionToPause.id, 'work:read');
      expect(pausedValidation.valid).toBe(false);
      expect(pausedValidation.companionStatus).toBe('PAUSED');
      
      await businessOSService.resumeCompanion(companionToPause.id);
      
      const resumedValidation = await businessOSService.validateCompanionAuthority(companionToPause.id, 'work:read');
      expect(resumedValidation.valid).toBe(true);
    });
  });

  describe('Evidence & Attribution Validation', () => {
    it('should record actor attribution for every operation', async () => {
      const attributions = await businessOSService.listActorAttributions();
      expect(attributions.length).toBeGreaterThan(0);
      
      const requiredFields = ['id', 'operation', 'initiatedBy', 'executedBy', 'timestamp', 'evidenceRefs'];
      for (const attr of attributions) {
        for (const field of requiredFields) {
          expect(attr).toHaveProperty(field);
        }
      }
    });

    it('should record attribution for companion creation', async () => {
      const companion = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'DOT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      const attributions = await businessOSService.listActorAttributions();
      const creationAttribution = attributions.find(a => a.evidenceRefs.includes(companion.id));
      
      expect(creationAttribution).toBeDefined();
      expect(creationAttribution!.operation).toBe('companion-created');
    });

    it('should record attribution for permission changes', async () => {
      const newScope = ['work:*', 'evidence:write'];
      await businessOSService.updateSeatAuthority(testSeatId, newScope);
      
      const attributions = await businessOSService.listActorAttributions();
      const updateAttribution = attributions.find(a => a.evidenceRefs.some(r => r.includes('new-scope')));
      
      expect(updateAttribution).toBeDefined();
    });
  });

  describe('Work Authorization Validation', () => {
    it('should correctly validate work authorization for companion', async () => {
      const authorization = await businessOSService.getWorkAuthorization(testCompanionId, 'work:write');
      
      expect(authorization).toBeDefined();
      expect(authorization.valid).toBe(true);
      expect(authorization.autonomyLevel).toBeDefined();
      expect(authorization.evidenceChain).toBeDefined();
    });

    it('should reject work authorization for revoked companion', async () => {
      const companionToRevoke = await businessOSService.createCompanion({
        seatId: testSeatId,
        type: 'AGENT',
        autonomyLevel: AutonomyLevel.A1,
        scopedPermissions: ['work:*'],
        validFrom: new Date().toISOString(),
      });
      
      await businessOSService.revokeCompanion(companionToRevoke.id);
      
      const authorization = await businessOSService.getWorkAuthorization(companionToRevoke.id, 'work:write');
      expect(authorization.valid).toBe(false);
    });
  });

  describe('Seat Summary Audit Validation', () => {
    it('should provide complete seat summary with audit trail', async () => {
      const summary = await businessOSService.getSeatSummary(testSeatId);
      
      expect(summary).toBeDefined();
      expect(summary.seat).toBeDefined();
      expect(summary.activeCompanions).toBeDefined();
      expect(summary.recentAttributions).toBeDefined();
      expect(summary.activeCompanions.length).toBeGreaterThan(0);
    });
  });
});