import { governanceEvidenceService } from './workspace/capabilities/governance-evidence/dist/implementation/services/governance-evidence.service.js';

console.log("What is governanceEvidenceService?", governanceEvidenceService);
console.log("What type is it?", typeof governanceEvidenceService);
console.log("What are its keys?", Object.keys(governanceEvidenceService));
console.log("Does it have addRevenueTrackingEntry?", 'addRevenueTrackingEntry' in governanceEvidenceService);
console.log("Is addRevenueTrackingEntry a function?", typeof governanceEvidenceService.addRevenueTrackingEntry === 'function');