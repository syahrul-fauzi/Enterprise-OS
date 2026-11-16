import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dashboardPath = join(process.cwd(), '.eos-state/coordination/command-center/war-room-dashboard.json');
let dashboard = JSON.parse(readFileSync(dashboardPath, 'utf8'));

dashboard.eos_war_room.shipped = 21;
dashboard.updated_at = new Date().toISOString();

dashboard.work_items.push({
  work_id: 'W-076',
  name: 'Agent runtime isolation continuity',
  status: 'SHIPPED',
  priority: 'HIGH',
  reuse_percentage: 100,
  updated_at: new Date().toISOString(),
  ready_at: new Date().toISOString(),
  shipped_at: new Date().toISOString()
});

writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2), 'utf8');
console.log('✅ War Room Dashboard updated: W-076 marked as SHIPPED, Total Shipped = 21');