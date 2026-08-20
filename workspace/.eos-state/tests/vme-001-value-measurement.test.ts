import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

describe('VME-001: Value Measurement Engine Baseline Validation', () => {
  const workItemsDir = path.join(process.cwd(), '.eos-state/work-items');
  const dashboardPath = path.join(process.cwd(), '.eos-state/eos-leverage-dashboard.json');
  
  it('semua RWP work item ter-load dengan metrics lengkap', () => {
    const rwpIds = ['RWP-001', 'RWP-002', 'RWP-003', 'RWP-004', 'RWP-005'];
    rwpIds.forEach(id => {
      const filePath = path.join(workItemsDir, `${id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(data.domain_glue_lines).toBeDefined();
      expect(data.human_friction_score).toBeDefined();
      expect(data.reuse_percentage).toBeDefined();
      expect(data.build_time_ratio !== undefined || id === 'RWP-001').toBe(true);
    });
  });

  it('human_friction_score menurun seiring bertambahnya sequence RWP (dari dashboard summary)', () => {
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    const rwpTable = dashboard.rwp_summary_table;
    const scores: number[] = [];
    rwpTable.forEach((entry: any) => scores.push(entry.human_friction_score));
    
    // Memastikan semua score setelahnya lebih rendah dari baseline
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i-1]);
    }
    // Final friction score mencapai 1.2
    expect(scores[scores.length-1]).toBe(1.2);
  });

  it('domain_glue_lines menunjukkan tren penurunan marginal cost', () => {
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    const rwpTable = dashboard.rwp_summary_table;
    const glueLines: number[] = [];
    rwpTable.forEach((entry: any) => glueLines.push(entry.domain_glue_lines));
    
    // Baseline RWP-001 adalah tertinggi
    expect(glueLines[0]).toBe(17);
    // Rata-rata 4 RWP terakhir < 10
    const avgLastFour = glueLines.slice(1).reduce((a,b) => a+b, 0) / 4;
    expect(avgLastFour).toBeLessThan(10);
    // Total semua glue sesuai dashboard
    expect(dashboard.substrate_lock_status.total_domain_glue_all_rwps).toBe(43);
  });

  it('build_time_ratio menurun konsisten dari baseline 1.0x', () => {
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    const rwpTable = dashboard.rwp_summary_table;
    const ratios: number[] = [1.0]; // RWP-001 baseline
    rwpTable.slice(1).forEach((entry: any) => ratios.push(entry.build_time_ratio));
    
    // Semua ratio setelah baseline menurun
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeLessThan(ratios[i-1]);
    }
    // Final ratio mencapai target 0.5x
    expect(ratios[ratios.length-1]).toBe(0.5);
  });

  it('dashboard ter-update dengan VME-001 sebagai in-progress work', () => {
    expect(fs.existsSync(dashboardPath)).toBe(true);
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    expect(dashboard.in_progress_rwps.includes('VME-001')).toBe(true);
    expect(dashboard.epistemic_status.absolute_monetary_roi).toBe('IN_PROGRESS_MEASUREMENT');
    expect(dashboard.epistemic_status.production_economics).toBe('ACTIVE_MEASUREMENT_PHASE');
  });

  it('tidak ada substrate lock violation di semua seri RWP', () => {
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    expect(dashboard.substrate_lock_status.substrate_frozen).toBe(true);
    expect(dashboard.substrate_lock_status.lock_violations).toBe(0);
    expect(dashboard.substrate_lock_status.no_new_primitives_added).toBe(true);
  });
});