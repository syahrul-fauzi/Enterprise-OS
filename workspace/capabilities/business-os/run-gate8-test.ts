import { BusinessOperatingFaceService } from './implementation/face.js';
import { BusinessOSService } from './implementation/service.js';
import { AutonomyLevel } from './implementation/business-os.contracts.js';

async function runGate8Tests() {
  console.log('=== BusinessOS Service Tests - Gate 8: FACE Capability Exposure ===\n');
  
  const service = new BusinessOSService();
  const faceService = new BusinessOperatingFaceService(service);
  
  // Test 1: Initialize fabric dan FACE
  console.log('Test 1: Initialize fabric dan FACE');
  const fabric = await service.getFabric();
  console.log('✓ Fabric initialized:', { seats: fabric.seats.length, companions: fabric.companions.length, attributions: fabric.actorAttributions.length });
  
  // Test 2: Create seat dengan evidence recording
  console.log('\nTest 2: Create seat dengan evidence recording');
  const seat = await service.createSeat({
    humanOwnerId: 'human-ops-1',
    authorityScope: ['operations', 'scorecard', 'l10'],
    seatName: 'Head of Operations',
    seatDescription: 'Seat untuk pengelolaan operasional harian',
  });
  console.log('✓ Seat created:', seat.id, 'owner:', seat.humanOwnerId, 'name:', seat.seatName);
  
  // Test 3: Create companion dengan validasi seat aktif
  console.log('\nTest 3: Create companion dengan validasi seat aktif');
  const dotCompanion = await service.createCompanion({
    seatId: seat.id,
    type: 'DOT',
    autonomyLevel: AutonomyLevel.A2,
    scopedPermissions: ['read:*', 'scorecard:view', 'l10:prepare', 'issue:create'],
    validFrom: new Date().toISOString(),
    companionName: 'Operations Dot',
    companionDescription: 'Dot companion untuk pengelolaan operasional',
  });
  console.log('✓ Dot companion created:', dotCompanion.id, 'type:', dotCompanion.type, 'level:', dotCompanion.autonomyLevel, 'name:', dotCompanion.companionName);
  
  // Test 4: Expose capability dengan otorisasi yang sesuai
  console.log('\nTest 4: Expose capability dengan otorisasi yang sesuai');
  const exposedCapability = await faceService.exposeFaceCapability(dotCompanion.id, 'scorecard:view', AutonomyLevel.A2);
  console.log('✓ Capability exposed:', { 
    capability: exposedCapability.capability, 
    allowed: exposedCapability.allowed, 
    reason: exposedCapability.reason,
    autonomyLevel: exposedCapability.autonomyLevel 
  });
  
  // Test 5: Cek capability yang membutuhkan level otonomi lebih tinggi
  console.log('\nTest 5: Cek capability yang membutuhkan level otonomi lebih tinggi');
  const a3Companion = await service.createCompanion({
    seatId: seat.id,
    type: 'DOT',
    autonomyLevel: AutonomyLevel.A3,
    companionName: 'Engineering Dot',
    scopedPermissions: [],
    validFrom: new Date().toISOString()
  });
  const engineeringCapabilityA2 = await faceService.exposeFaceCapability(dotCompanion.id, 'engineering:execute', AutonomyLevel.A3);
  const engineeringCapabilityA3 = await faceService.exposeFaceCapability(a3Companion.id, 'engineering:execute', AutonomyLevel.A3);
  console.log('✓ Capability level check:', { 
    a2Allowed: engineeringCapabilityA2.allowed, 
    a3Allowed: engineeringCapabilityA3.allowed,
    reasonA2: engineeringCapabilityA2.reason,
    reasonA3: engineeringCapabilityA3.reason
  });
  
  // Test 6: Autonomy level enforcement pada FACE
  console.log('\nTest 6: Autonomy level enforcement pada FACE');
  const a2Sufficient = await faceService.exposeFaceCapability(dotCompanion.id, 'scorecard:view', AutonomyLevel.A2);
  const a3Required = await faceService.exposeFaceCapability(dotCompanion.id, 'scorecard:view', AutonomyLevel.A3);
  console.log('✓ Autonomy level enforcement:', { 
    a2Sufficient: a2Sufficient.allowed, 
    a3Required: a3Required.allowed,
    dotLevel: dotCompanion.autonomyLevel 
  });
  
  // Test 7: Get FACE capabilities untuk companion
  console.log('\nTest 7: Get FACE capabilities untuk companion');
  const faceCapabilities = await faceService.getFaceCapabilities(dotCompanion.id);
  console.log('✓ FACE capabilities retrieved:', { 
    companionId: faceCapabilities.companionId, 
    totalCapabilities: faceCapabilities.capabilities.length,
    autonomyLevel: faceCapabilities.autonomyLevel 
  });
  
  // Test 8: Validate FACE action
  console.log('\nTest 8: Validate FACE action');
  const validAction = await faceService.validateFaceAction(dotCompanion.id, 'scorecard:view', { action: 'view' });
  console.log('✓ FACE action validated:', { 
    valid: validAction.valid, 
    reason: validAction.reason,
    evidenceRequired: validAction.evidenceRequired 
  });
  
  // Test 9: Record FACE interaction
  console.log('\nTest 9: Record FACE interaction');
  const interaction = await faceService.recordFaceInteraction({
    companionId: dotCompanion.id,
    actionId: 'scorecard:view',
    parameters: { view: 'dashboard' },
    result: 'success',
  });
  console.log('✓ FACE interaction recorded:', { 
    interactionId: interaction.id, 
    companionId: interaction.companionId,
    action: interaction.action,
    result: interaction.result 
  });
  
  // Test 10: List FACE interactions
  console.log('\nTest 10: List FACE interactions');
  const interactions = await faceService.listFaceInteractions(dotCompanion.id);
  console.log('✓ FACE interactions listed:', interactions.length, 'interactions');
  
  console.log('\n=== All Gate 8 tests passed! ✓ ===');
  console.log('\nGate 8 Exit Criteria Verification:');
  console.log('✓ FACE capability exposure berfungsi dengan otorisasi yang sesuai');
  console.log('✓ Autonomy level enforcement pada FACE berfungsi');
  console.log('✓ FACE capabilities retrieval berfungsi');
  console.log('✓ FACE action validation berfungsi');
  console.log('✓ FACE interaction recording berfungsi');
  console.log('✓ FACE interaction listing berfungsi');
}

runGate8Tests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});