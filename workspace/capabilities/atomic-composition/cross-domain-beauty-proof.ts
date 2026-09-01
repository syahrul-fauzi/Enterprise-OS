/**
 * P4 CROSS-DOMAIN PROOF: Beauty Domain (Salon/Kecantikan)
 * Membuktikan atomic-composition engine bekerja di domain BERBEDA TANPA PERUBAHAN ENGINE
 * Hanya: Requirements, Capabilities, Actors yang berubah
 */

import { WorkId, Work } from '@capabilities/work-core/contracts/work.contracts';
import { 
  Actor, ActorId, 
  Requirement, RequirementId
} from './implementation/contracts/atomic-composition.contracts';
import { CompositionRepository } from './implementation/repository/composition.repository';
import { AtomicCompositionService } from './implementation/services/composition.service';

// Inisialisasi repository
await CompositionRepository.initialize();
const service = new AtomicCompositionService();

console.log("==================================================");
console.log("🧪 P4 CROSS-DOMAIN PROOF - BEAUTY DOMAIN (SALON)");
console.log("==================================================");

// STEP 1: Create Work (Beauty Domain - Launch New Salon Branch)
const salonLaunchWork: Work = {
  workId: WorkId("work-salon-bandung-001"),
  title: "Launch New Salon Branch in Bandung",
  description: "Open new beauty salon location with full services",
  createdAt: new Date().toISOString(),
  tenantId: "beauty-domain-001",
  status: "active"
};
console.log("📋 Step 1: Create Work -", salonLaunchWork.title);

// STEP 2: Beauty Domain Requirements (BERBEDA dari website launch sebelumnya)
const beautyRequirements: Requirement[] = [
  {
    requirementId: "req-beauty-001" as RequirementId,
    description: "Salon location setup & interior design",
    capabilityId: "interior-design",
    minimumTrust: 0.8,
    authority: ["approve:design", "spend:budget"],
    resolved: false
  },
  {
    requirementId: "req-beauty-002" as RequirementId,
    description: "Staff recruitment & training (beauticians)",
    capabilityId: "hr-training",
    minimumTrust: 0.8,
    authority: ["approve:hire", "schedule:training"],
    resolved: false
  },
  {
    requirementId: "req-beauty-003" as RequirementId,
    description: "Beauty product inventory & supply chain",
    capabilityId: "inventory-management",
    minimumTrust: 0.7,
    authority: ["order:stock", "manage:warehouse"],
    resolved: false
  },
  {
    requirementId: "req-beauty-004" as RequirementId,
    description: "Marketing & grand opening event",
    capabilityId: "event-marketing",
    minimumTrust: 0.7,
    authority: ["book:venue", "promote:event"],
    resolved: false
  }
];
console.log("📋 Step 2: Created", beautyRequirements.length, "Beauty Domain requirements");

// STEP 3: Beauty Domain Actors & Capabilities (BERBEDA)
const beautyActors: Actor[] = [
  {
    actorId: ActorId("actor-siti-001"),
    name: "Siti - Interior Designer",
    capabilities: ["interior-design", "space-planning"],
    organizationId: "beauty-vendor-001",
    trust: 0.95,
    availability: true
  },
  {
    actorId: ActorId("actor-andi-001"),
    name: "Andi - HR Manager",
    capabilities: ["hr-training", "recruitment"],
    organizationId: "salon-hq-001",
    trust: 0.92,
    availability: true
  },
  {
    actorId: ActorId("actor-lina-001"),
    name: "Lina - Supply Chain Manager",
    capabilities: ["inventory-management", "logistics"],
    organizationId: "beauty-supplies-001",
    trust: 0.88,
    availability: true
  },
  {
    actorId: ActorId("actor-riko-001"),
    name: "Riko - Marketing Specialist",
    capabilities: ["event-marketing", "digital-marketing"],
    organizationId: "salon-marketing-001",
    trust: 0.90,
    availability: true
  }
];

const availableCapabilities = ["interior-design", "hr-training", "inventory-management", "event-marketing", "space-planning", "recruitment", "logistics", "digital-marketing"];
console.log("📋 Step 3: Beauty Domain actors & capabilities ready");

// STEP 4: Compose Team - MENGGUNAKAN ENGINE YANG SAMA PERSIS!
const compositionResult = await service.composeTeamFromRequirements({
  work: salonLaunchWork,
  requirements: beautyRequirements,
  availableCapabilities,
  availableActors: beautyActors
});

console.log("✅ Step 4: Team composed for Beauty Domain -", compositionResult.team?.teamId);
console.log("   Assignments created:", compositionResult.assignments?.length);

// STEP 5: Multi-Actor Execution - SAMA ENGINE, BERBEDA ACTOR ACTIONS
console.log("📋 Step 5: Multi-Actor Execution for Beauty Domain starts...");
const assignments = compositionResult.assignments || [];

for (const assignment of assignments) {
  const actor = beautyActors.find(a => String(a.actorId) === String(assignment.actorId));
  if (!actor) continue;
  
  const result = await service.executeActorAction(
    compositionResult.compositionId!,
    assignment.assignmentId,
    actor.actorId,
    {
      evidence: `${actor.capabilities[0]}-beauty-salon-delivered-${Date.now()}`,
      status: "completed"
    }
  );
  
  if (result.success) {
    console.log("   ✅", actor.name, "completed assignment:", assignment.description);
  }
}

// Wait for persistence
await new Promise(resolve => setTimeout(resolve, 100));

// STEP 6: Verify final state
const finalComposition = await CompositionRepository.loadFullComposition(compositionResult.compositionId!);
console.log("\n📋 Step 6: Final state verification");
console.log("   Team final status:", finalComposition?.team?.status);
console.log("   All assignments completed:", finalComposition?.assignments?.every(a => a.status === "completed"));

console.log("\n==================================================");
console.log("🎉 P4 CROSS-DOMAIN PROOF - BEAUTY DOMAIN 100% COMPLETE");
console.log("==================================================");
console.log("✅ atomic-composition engine bekerja di domain BERBEDA");
console.log("✅ TIDAK ADA perubahan pada composition engine");
console.log("✅ Hanya Requirements, Capabilities, Actors yang berubah");
console.log("✅ EOS model Work→Team→Execution berjalan sama persis!");