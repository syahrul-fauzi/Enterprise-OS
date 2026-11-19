// @ts-nocheck
import { BusinessOSService } from './implementation/service.js';
import { BusinessOperatingFaceService } from './implementation/face.js';
import { AutonomyLevel } from './implementation/business-os.contracts.js';

async function runPilotCycle() {
  console.log('=== Business OS Pilot Cycle: Strategy → Rocks → Scorecard → L10 → IDS → To-Do → Evidence ===\n');

  const service = new BusinessOSService();
  const faceService = new BusinessOperatingFaceService(service);

  // Step 1: Initialize fabric
  await service.initializeFabric();
  console.log('✅ Fabric initialized');

  // Step 2: Create Seat for CEO
  const ceoSeat = await service.createSeat({
    humanOwnerId: 'human-ceo-1',
    name: 'CEO',
    authorityScope: ['strategy', 'performance', 'quarterly-objectives', 'meetings', 'decisions'],
  });
  console.log(`✅ CEO Seat created: ${ceoSeat.id}`);

  // Step 3: Create Companion for CEO (A2 autonomy)
  const ceoDot = await service.createCompanion({
    seatId: ceoSeat.id,
    type: 'DOT',
    name: 'CEO Dot',
    autonomyLevel: AutonomyLevel.A2,
  });
  console.log(`✅ CEO Dot created: ${ceoDot.id}, level: ${ceoDot.autonomyLevel}`);

  // Step 4: Get FACE for CEO Dot
  const face = await faceService.getFaceForSeat(ceoSeat.id, ceoDot.id);
  console.log(`✅ FACE retrieved, available actions: ${face.availableActions.length}`);
  console.log(`   Domain views: ${face.domainViews.map(v => v.domain).join(', ')}\n`);

  // Step 5: Create Strategic Intent (VTO)
  console.log('--- Step 1: Create Strategic Intent (VTO) ---');
  const vtoAction = face.availableActions.find(a => a.actionId === 'vto.create');
  const vtoResult = await faceService.executeAction(ceoDot.id, 'vto.create', {
    intent: 'Menjadi platform EOS terdepan untuk operasional bisnis universal',
    targetDate: '2026-12-31',
  });
  console.log(`✅ Strategic Intent created, attribution: ${vtoResult.attribution.id}\n`);

  // Step 6: Create Quarterly Objective (Rock)
  console.log('--- Step 2: Create Quarterly Objective (Rock) ---');
  const rocksAction = face.availableActions.find(a => a.actionId === 'rocks.create');
  const rocksResult = await faceService.executeAction(ceoDot.id, 'rocks.create', {
    objective: 'Menyelesaikan Business OS Pilot Gate 6',
    dueDate: '2026-11-30',
  });
  console.log(`✅ Quarterly Objective created, attribution: ${rocksResult.attribution.id}\n`);

  // Step 7: View Scorecard (Business Performance)
  console.log('--- Step 3: View Scorecard (Business Performance) ---');
  const scorecardAction = face.availableActions.find(a => a.actionId === 'scorecard.read');
  const scorecardResult = await faceService.executeAction(ceoDot.id, 'scorecard.read', {});
  console.log(`✅ Scorecard viewed, attribution: ${scorecardResult.attribution.id}\n`);

  // Step 8: Create L10 Meeting
  console.log('--- Step 4: Create L10 Meeting ---');
  const l10Action = face.availableActions.find(a => a.actionId === 'l10.create');
  const l10Result = await faceService.executeAction(ceoDot.id, 'l10.create', {
    meetingTitle: 'L10 Business OS Pilot Review',
    date: new Date().toISOString(),
    attendees: ['human-ceo-1', 'human-ops-1'],
  });
  console.log(`✅ L10 Meeting created, attribution: ${l10Result.attribution.id}\n`);

  // Step 9: Create IDS (Issue & Decision)
  console.log('--- Step 5: Create IDS (Issue & Decision) ---');
  const idsAction = face.availableActions.find(a => a.actionId === 'ids.create');
  const idsResult = await faceService.executeAction(ceoDot.id, 'ids.create', {
    issue: 'Perlu verifikasi integrasi FACE dengan Work Core',
    decision: 'Jalankan test pilot cycle end-to-end',
  });
  console.log(`✅ IDS created, attribution: ${idsResult.attribution.id}\n`);

  // Step 10: Create To-Do (Actionable Work)
  console.log('--- Step 6: Create To-Do (Actionable Work) ---');
  const todosAction = face.availableActions.find(a => a.actionId === 'todos.create');
  const todosResult = await faceService.executeAction(ceoDot.id, 'todos.create', {
    task: 'Dokumentasikan hasil pilot cycle Gate 6',
    dueDate: '2026-11-20',
  });
  console.log(`✅ To-Do created, attribution: ${todosResult.attribution.id}\n`);

  // Step 11: List FACE interactions (Audit Trail)
  console.log('--- Step 7: List FACE Interactions (Audit Trail) ---');
  const interactions = await faceService.listFaceInteractions(ceoDot.id);
  console.log(`✅ Total interactions: ${interactions.total}`);
  interactions.interactions.forEach((interaction, i) => {
    console.log(`   ${i+1}. ${interaction.action} at ${interaction.recordedAt}`);
  });

  console.log('\n=== ✅ PILOT CYCLE COMPLETED! Satu siklus bisnis utuh berhasil dijalankan ===');
  console.log('   Alur: Strategic Intent → Quarterly Objective → Scorecard → L10 → IDS → To-Do → Audit Trail');
  console.log('   Semua tindakan memiliki actor attribution dan evidence recording');
}

runPilotCycle().catch(err => {
  console.error('❌ Pilot cycle failed:', err);
  process.exit(1);
});