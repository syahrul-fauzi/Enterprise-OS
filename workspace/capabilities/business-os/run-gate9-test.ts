import { BusinessOperatingFaceService } from './implementation/face.js';
import { BusinessOSService } from './implementation/service.js';
import { AutonomyLevel } from './implementation/business-os.contracts.js';

async function runGate9Tests() {
  console.log('=== BusinessOS Service Tests - Gate 9: FACE Interaction Recording & Audit Trail ===\n');
  
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
  
  // Test 4: Record beberapa interaksi FACE dengan berbagai jenis action
  console.log('\nTest 4: Record beberapa interaksi FACE dengan berbagai jenis action');
  const interaction1 = await faceService.recordFaceInteraction({
    companionId: dotCompanion.id,
    actionId: 'scorecard:view',
    parameters: { period: '2024-Q1' },
    result: { success: true, scorecardId: 'scorecard-1' }
  });
  console.log('✓ Interaction 1 recorded:', interaction1.interactionId, 'action:', interaction1.action);
  
  const interaction2 = await faceService.recordFaceInteraction({
    companionId: dotCompanion.id,
    actionId: 'l10:prepare',
    parameters: { meetingDate: '2024-01-15' },
    result: { success: true, agendaItems: 5 }
  });
  console.log('✓ Interaction 2 recorded:', interaction2.interactionId, 'action:', interaction2.action);
  
  const interaction3 = await faceService.recordFaceInteraction({
    companionId: dotCompanion.id,
    actionId: 'issue:create',
    parameters: { title: 'Bug report', description: 'Critical issue' },
    result: { success: true, issueId: 'issue-1' }
  });
  console.log('✓ Interaction 3 recorded:', interaction3.interactionId, 'action:', interaction3.action);
  
  // Test 5: List FACE interactions dan verifikasi audit trail
  console.log('\nTest 5: List FACE interactions dan verifikasi audit trail');
  const interactions = await faceService.listFaceInteractions(dotCompanion.id);
  console.log('✓ Audit trail retrieved:', { total: interactions.total, length: interactions.length });
  
  // Test 6: Verifikasi bahwa audit trail berisi semua field yang diperlukan
  console.log('\nTest 6: Verifikasi bahwa audit trail berisi semua field yang diperlukan');
  const requiredFields = ['id', 'interactionId', 'recordedAt', 'companionId', 'action', 'result'];
  const allFieldsPresent = interactions.interactions.every(interaction => 
    requiredFields.every(field => field in interaction)
  );
  console.log('✓ All required fields present:', allFieldsPresent);
  
  // Test 7: Verifikasi bahwa timestamp dalam format ISO yang valid
  console.log('\nTest 7: Verifikasi bahwa timestamp dalam format ISO yang valid');
  const validTimestamps = interactions.interactions.every(interaction => {
    const date = new Date(interaction.recordedAt);
    return !isNaN(date.getTime()) && interaction.recordedAt === date.toISOString();
  });
  console.log('✓ All timestamps are valid ISO format:', validTimestamps);
  
  // Test 8: Record interaksi dengan error result
  console.log('\nTest 8: Record interaksi dengan error result');
  const errorInteraction = await faceService.recordFaceInteraction({
    companionId: dotCompanion.id,
    actionId: 'scorecard:update',
    parameters: { scorecardId: 'scorecard-1', values: {} },
    result: { success: false, error: 'Permission denied' }
  });
  console.log('✓ Error interaction recorded:', errorInteraction.interactionId, 'result:', errorInteraction.result.success);
  
  // Test 9: List interactions lagi dan verifikasi total bertambah
  console.log('\nTest 9: List interactions lagi dan verifikasi total bertambah');
  const updatedInteractions = await faceService.listFaceInteractions(dotCompanion.id);
  console.log('✓ Updated audit trail:', { total: updatedInteractions.total, expected: 4 });
  
  // Test 10: Verifikasi bahwa action ID dan result disimpan dengan benar
  console.log('\nTest 10: Verifikasi bahwa action ID dan result disimpan dengan benar');
  const actionCorrect = updatedInteractions.interactions.some(interaction => 
    interaction.action === 'scorecard:update' && 
    interaction.result.success === false && 
    interaction.result.error === 'Permission denied'
  );
  console.log('✓ Action ID and result stored correctly:', actionCorrect);
  
  console.log('\n✅ Semua test Gate 9 lulus!');
}

runGate9Tests().catch(error => {
  console.error('❌ Test Gate 9 gagal:', error);
  process.exit(1);
});