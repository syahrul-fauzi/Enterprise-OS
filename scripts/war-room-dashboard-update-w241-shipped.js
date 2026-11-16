import { readFileSync, writeFileSync } from 'fs';
const dashboardPath = 'require('path').resolve(__dirname, '..')/.eos-state/coordination/command-center/war-room-dashboard.json';
const dashboard = JSON.parse(readFileSync(dashboardPath, 'utf8'));
const existingIndex = dashboard.work_items.findIndex(w => w.work_id === 'W-077');
if (existingIndex >= 0) {
  dashboard.work_items[existingIndex].status = 'SHIPPED';
  dashboard.work_items[existingIndex].shipped_at = new Date().toISOString();
} else {
  dashboard.work_items.push({
    work_id: 'W-077',
    name: 'Audit isolation continuity',
    status: 'SHIPPED',
    shipped_at: new Date().toISOString()
  });
}
dashboard.eos_war_room.shipped = dashboard.work_items.filter(w => w.status === 'SHIPPED').length;
dashboard.updated_at = new Date().toISOString();
writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
console.log(`✅ War Room Dashboard updated: W-077 marked as SHIPPED, TotalShipped = ${dashboard.eos_war_room.shipped}`);