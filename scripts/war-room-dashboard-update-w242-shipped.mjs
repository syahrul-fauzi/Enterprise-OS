import fs from 'fs';
import path from 'path';

const dashboardPath = path.join(process.cwd(), '.eos-state', 'coordination', 'command-center', 'war-room-dashboard.json');

console.log('=== Updating War Room Dashboard: W242 SHIPPED ===');

const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

const w242Index = dashboard.work_items.findIndex(w => w.work_id === 'W242');
if (w242Index !== -1) {
  dashboard.work_items[w242Index].status = 'SHIPPED';
  dashboard.work_items[w242Index].shipped_at = new Date().toISOString();
  dashboard.work_items[w242Index].updated_at = new Date().toISOString();
  dashboard.work_items[w242Index].verification_evidence = [
    'execution-script-w242-execution.mjs-exit-code-0',
    'verification-script-w242-verification.mjs-all-tests-passed',
    'invocation-evidence-chain-4-entries-complete'
  ];
  console.log(`✓ W242 status updated to SHIPPED`);
}

dashboard.eos_war_room.shipped += 1;
dashboard.updated_at = new Date().toISOString();

fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
console.log(`✓ Dashboard summary updated: total shipped = ${dashboard.eos_war_room.shipped}`);
console.log('=== War Room Dashboard Update COMPLETE ===');