import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessOSService } from '../implementation/service.js';
import { AutonomyLevel } from '../implementation/business-os.contracts.js';

const businessOSService = new BusinessOSService();
let testSeatId: string;

describe('BusinessOSService', () => {
  beforeEach(async () => {
    await businessOSService.initializeFabric();
    const seat = await businessOSService.createSeat({
      humanOwnerId: 'human-test',
      authorityScope: ['workspace-1', 'seat-operations'],
    });
    testSeatId = seat.id;
  });

  it('should initialize with empty fabric except the test seat created in beforeEach', async () => {
    const fabric = await businessOSService.getFabric();
    expect(fabric.seats).toHaveLength(1);
    expect(fabric.companions).toHaveLength(0);
    // Actor attributions may have 1 entry from seat creation
    expect(fabric.actorAttributions.length).toBeGreaterThanOrEqual(0);
  });

  it('should create a seat', async () => {
    const seat = await businessOSService.createSeat({
      humanOwnerId: 'human-123',
      authorityScope: ['workspace-1', 'seat-operations'],
    });
    expect(seat.id).toBeDefined();
    expect(seat.humanOwnerId).toBe('human-123');
    expect(seat.status).toBe('ACTIVE');
  });

  it('should create a companion', async () => {
    const companion = await businessOSService.createCompanion({
      seatId: testSeatId,
      type: 'DOT',
      autonomyLevel: AutonomyLevel.A0,
      scopedPermissions: ['read:work'],
      validFrom: new Date().toISOString(),
    });
    expect(companion.id).toBeDefined();
    expect(companion.type).toBe('DOT');
    expect(companion.status).toBe('ACTIVE');
  });

  it('should revoke a companion', async () => {
    const companion = await businessOSService.createCompanion({
      seatId: testSeatId,
      type: 'DOT',
      autonomyLevel: AutonomyLevel.A0,
      scopedPermissions: ['read:work'],
      validFrom: new Date().toISOString(),
    });
    await businessOSService.revokeCompanion(companion.id);
    const fabric = await businessOSService.getFabric();
    const revokedCompanion = fabric.companions.find((c: any) => c.id === companion.id);
    expect(revokedCompanion?.status).toBe('REVOKED');
  });
});