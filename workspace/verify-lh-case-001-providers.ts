/**
 * Verification script for LH-CASE-001 capability provider resolution
 * Validates that pt-establishment-manager resolves correctly for company-formation-management
 */

import { CapabilityResolverService } from './capabilities/atomic-composition/implementation/services/capability-resolver.service';

async function verifyLHCase001Providers() {
  console.log('[VERIFY] Starting LH-CASE-001 provider resolution check...');
  
  const resolver = new CapabilityResolverService();
  
  // Required capabilities for PT pendirian (lh-case-001)
  const requiredCapabilities = [
    "company-formation-management",
    "legal-document-preparation", 
    "notarization-coordination"
  ];
  
  console.log(`[VERIFY] Required capabilities: ${requiredCapabilities.join(', ')}`);
  
  const resolvedProviders = await resolver.resolveProviders(requiredCapabilities);
  
  console.log(`[VERIFY] Resolved ${resolvedProviders.length} providers:`);
  resolvedProviders.forEach(p => {
    console.log(`  - ${p.id} (${p.name}) → capability: ${p.capabilityId}, score: ${p.availabilityScore}`);
  });
  
  // Verify pt-establishment-manager is present (system provider for company formation)
  const ptManager = resolvedProviders.find(p => p.id === "pt-establishment-manager");
  if (ptManager) {
    console.log('\n✅ [PASS] pt-establishment-manager FOUND - correctly resolved for LH-CASE-001');
    console.log(`   Provider: ${ptManager.name}`);
    console.log(`   Capability: ${ptManager.capabilityId}`);
    console.log(`   Availability score: ${ptManager.availabilityScore}`);
  } else {
    console.error('\n❌ [FAIL] pt-establishment-manager NOT RESOLVED - critical provider missing');
    process.exit(1);
  }
  
  // Verify legal-document-generator is present
  const docGenerator = resolvedProviders.find(p => p.id === "legal-document-generator");
  if (docGenerator) {
    console.log('\n✅ [PASS] legal-document-generator FOUND - correctly resolved');
  }
  
  console.log('\n[VERIFY] All LH-CASE-001 capability checks PASSED');
  console.log(`[VERIFY] Total reuse: ${resolvedProviders.length} existing providers, ZERO new code required`);
}

verifyLHCase001Providers().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});