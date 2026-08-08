import { GovernanceReadModelService } from './services/governance-read-model.service.js';

function main() {
  const readModelService = new GovernanceReadModelService();

  console.log('--- EOS System Health Summary ---');
  try {
    const summary = readModelService.getSystemHealthSummary();
    console.log(JSON.stringify(summary, null, 2));
  } catch (e: any) {
    console.error('Failed to get system health summary:', e.message);
  }
  console.log('---------------------------------');
}

main();