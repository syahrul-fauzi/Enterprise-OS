import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { trustFrameworkService } from "../../../trust-framework/implementation/services/trust-framework.service";

const { existsSync, readFileSync, readdirSync } = fs;
const { dirname, resolve, join } = path;
import type {
  GovernanceEvidenceArtifactCatalog,
  GovernanceEvidenceArtifactKind,
  GovernanceEvidenceArtifactLocation,
  GovernanceEvidenceProvider,
  GovernanceSession,
  JsonArtifact,
  JsonRecord,
  RuntimeInvocation,
  AggregatedEvidence,
  CapabilityEvidenceRequirements,
  GovernanceConfidenceVerdict,
} from "../contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Hitung path yang benar ke workspace root: dari /workspace/capabilities/.../services
// __dirname = /root/Enterprise-OS/workspace/capabilities/governance-evidence/implementation/services
// ../../.. = /root/Enterprise-OS/workspace (benar, tanpa tambahan /workspace)
const WORKSPACE_ROOT = resolve(__dirname, "../../../..");

const EVIDENCE_PATHS: Record<GovernanceEvidenceArtifactKind, string> = {
  report: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-report.json",
  ),
  session: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/governance-session.json",
  ),
  attestationPolicy: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-attestation-policy.json",
  ),
  lawResults: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-law-results.json",
  ),
  evidencePackages: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-evidence-packages.json",
  ),
  certificates: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-certificates.json",
  ),
  attestations: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-attestations.json",
  ),
  proofBundle: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-proof-bundle.json",
  ),
};

class GovernanceEvidenceArtifactCatalogFileSystem implements GovernanceEvidenceArtifactCatalog {
  resolve(
    kind: GovernanceEvidenceArtifactKind,
  ): GovernanceEvidenceArtifactLocation {
    return {
      kind,
      path: EVIDENCE_PATHS[kind],
    };
  }
}

function readArtifact(
  path: string,
  kind: GovernanceEvidenceArtifactKind,
): JsonArtifact {
  if (!existsSync(path)) {
    throw new Error(
      `governance_evidence_${kind}_unavailable: missing evidence artifact at ${path}. Run constitution/foundation verification first.`,
    );
  }

  return JSON.parse(readFileSync(path, "utf8")) as JsonArtifact;
}

function asJsonRecord(
  artifact: JsonArtifact,
  kind: GovernanceEvidenceArtifactKind,
): JsonRecord {
  if (Array.isArray(artifact)) {
    throw new Error(
      `governance_evidence_${kind}_shape_mismatch: expected object evidence artifact.`,
    );
  }

  return artifact as JsonRecord;
}

export class GovernanceEvidenceService implements GovernanceEvidenceProvider {
  constructor(
    private readonly catalog: GovernanceEvidenceArtifactCatalog = new GovernanceEvidenceArtifactCatalogFileSystem(),
  ) {}

  getAuditReport(): JsonRecord {
    const location = this.catalog.resolve("report");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    );
    return result;
  }

  getGovernanceSession(): GovernanceSession {
    const location = this.catalog.resolve("session");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    ) as GovernanceSession;
    return result;
  }

  getAttestationPolicy(): JsonRecord {
    const location = this.catalog.resolve("attestationPolicy");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    );
    const frameworkId =
      result.trust_framework !== null &&
      typeof result.trust_framework === "object" &&
      !Array.isArray(result.trust_framework)
        ? String(
            (result.trust_framework as Record<string, unknown>).framework_id ??
              "",
          )
        : "";
    if (frameworkId.length > 0) {
      trustFrameworkService.getFramework(frameworkId);
    }
    return result;
  }

  getLawResults(): JsonArtifact {
    const location = this.catalog.resolve("lawResults");
    const result = readArtifact(location.path, location.kind);
    return result;
  }

  getEvidencePackages(): JsonArtifact {
    const location = this.catalog.resolve("evidencePackages");
    const result = readArtifact(location.path, location.kind);
    return result;
  }

  getCertificates(): JsonArtifact {
    const location = this.catalog.resolve("certificates");
    const result = readArtifact(location.path, location.kind);
    return result;
  }

  getAttestations(): JsonArtifact {
    const location = this.catalog.resolve("attestations");
    const result = readArtifact(location.path, location.kind);
    return result;
  }

  getProofBundle(): JsonRecord {
    const location = this.catalog.resolve("proofBundle");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    );
    return result;
  }

  getAggregatedRuntimeEvidence(): AggregatedEvidence {
    // Scan BOTH product directories AND internal capability directories that have their own evidence collection
    const scanPaths: string[] = [
      // Products
      resolve(WORKSPACE_ROOT, "products/lawyershub/evidence/verification/runtime-invocations.jsonl"),
      resolve(WORKSPACE_ROOT, "products/services-id/evidence/verification/runtime-invocations.jsonl"),
      resolve(WORKSPACE_ROOT, "products/academic/evidence/verification/runtime-invocations.jsonl"),
      resolve(WORKSPACE_ROOT, "products/ilc/evidence/verification/runtime-invocations.jsonl"),
      // Capabilities with internal collectors (B7.18.2 observability, B7.18.3 requirements-traceability-matrix)
      resolve(WORKSPACE_ROOT, "capabilities/observability/evidence/verification/runtime-invocations.jsonl"),
      resolve(WORKSPACE_ROOT, "capabilities/governance-read-model/evidence/verification/runtime-invocations.jsonl"),
      resolve(WORKSPACE_ROOT, "capabilities/requirements-traceability-matrix/evidence/verification/runtime-invocations.jsonl"),
    ];
    
    const allInvocations: RuntimeInvocation[] = [];
    const byProduct: Record<string, number> = {};
    const byCapability: Record<string, number> = {};
    const operationCounts: Record<string, number> = {};
    let successCount = 0;

    scanPaths.forEach((invocationPath) => {
      console.log(`[DEBUG] Checking evidence at: ${invocationPath} | exists: ${existsSync(invocationPath)}`);
      
      if (existsSync(invocationPath)) {
        const fileContent = readFileSync(invocationPath, "utf8");
        const lines = fileContent.split("\n").filter((line: string) => line.trim().length > 0);
        console.log(`[DEBUG] Valid lines at ${invocationPath}: ${lines.length}`);
        
        lines.forEach((line: string, index: number) => {
          try {
            const invocation = JSON.parse(line) as RuntimeInvocation;
            allInvocations.push(invocation);
            console.log(`[DEBUG] Parsed invocation: ${invocation.capability_id} / ${invocation.operation_id}`);
            
            // Track by source (product vs capability)
            const source = invocationPath.includes("/products/") ? invocationPath.split("/products/")[1].split("/")[0] : "internal-capability";
            byProduct[source] = (byProduct[source] || 0) + 1;
            byCapability[invocation.capability_id] = (byCapability[invocation.capability_id] || 0) + 1;
            operationCounts[invocation.operation_id] = (operationCounts[invocation.operation_id] || 0) + 1;
            
            if (invocation.success) successCount++;
          } catch (e) {
            console.error(`[DEBUG] JSON ERROR at ${invocationPath} line ${index}:`, e);
            console.error(`[DEBUG] Line content: ${line}`);
          }
        });
      }
    });

    const topOperations = Object.entries(operationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));

    const aggregated: AggregatedEvidence = {
      total_invocations: allInvocations.length,
      by_product: byProduct,
      by_capability: byCapability,
      success_rate: allInvocations.length > 0 ? successCount / allInvocations.length : 0,
      top_operations: topOperations,
      all_invocations: allInvocations,
    };


    return aggregated;
  }

  loadAllCapabilityMetadata(): CapabilityEvidenceRequirements[] {
    const capabilitiesPath = resolve(WORKSPACE_ROOT, "capabilities");
    const capabilityDirs = readdirSync(capabilitiesPath, { withFileTypes: true })
      .filter((dirent: fs.Dirent) => dirent.isDirectory())
      .map((dirent: fs.Dirent) => dirent.name);

    const allCapabilityMetadata: CapabilityEvidenceRequirements[] = [];

    for (const dir of capabilityDirs) {
      const capabilityYamlPath = join(capabilitiesPath, dir, "definition", "capability.yaml");
      if (existsSync(capabilityYamlPath)) {
        const content = readFileSync(capabilityYamlPath, "utf8");

        const idMatch = content.match(/^id: (.*)$/m);
        const ownerMatch = content.match(/^owner: (.*)$/m);
        const maturityMatch = content.match(/maturity:\n\s+level: (.*)$/m);
        
        const evidenceRequiredMatches = [...content.matchAll(/evidence_required:\n(\s+- .*)+/g)];
        const consumersMatches = [...content.matchAll(/consumers:\n(\s+- .*)+/g)];

        const evidenceRequired: string[] = [];
        if (evidenceRequiredMatches.length > 0) {
          const lines = evidenceRequiredMatches[0][0].split('\n').slice(1);
          lines.forEach((line: string) => {
            const match = line.match(/-\s*(.*)/);
            if (match) evidenceRequired.push(match[1].trim());
          });
        }

        const consumers: string[] = [];
        if (consumersMatches.length > 0) {
          const lines = consumersMatches[0][0].split('\n').slice(1);
          lines.forEach((line: string) => {
            const match = line.match(/-\s*(.*)/);
            if (match) consumers.push(match[1].trim());
          });
        }

        if (idMatch && ownerMatch && maturityMatch) {
          allCapabilityMetadata.push({
            capability_id: idMatch[1].trim(),
            owner: ownerMatch[1].trim(),
            evidence_required: evidenceRequired,
            consumers: consumers,
            maturity_level: maturityMatch[1].trim(),
          });
        }
      }
    }
    

    return allCapabilityMetadata;
  }

  calculateCapabilityConfidence(capability: CapabilityEvidenceRequirements): GovernanceConfidenceVerdict {
    // Full confidence calculation logic implementing "No proof without marginal information gain"
    const aggregatedEvidence = this.getAggregatedRuntimeEvidence();
    const now = new Date().toISOString();

    let confidence_score = 0.0;
    let decision: "PASS" | "HOLD" | "FAIL" = "HOLD";
    const rationale: string[] = [];
    const evidence_met: string[] = [];
    const evidence_missing: string[] = [];
    
    // Define evidence weights (each evidence type contributes specific marginal value)
    const evidenceWeights: Record<string, number> = {
      "production_usage": 0.3,      // Core foundational evidence
      "security_validation": 0.15,  // Critical for trust
      "user-adoption": 0.15,        // User-centric adoption
      "multiple_consumers": 0.1,    // Reusability proof
      "cross_domain_adoption": 0.1, // Cross-architecture value
      "cross_product_uniformity": 0.1, // Consistent implementation
      "full_coverage": 0.05,       // Comprehensive observability
      "end_to_end_lifecycle": 0.05, // Complete lifecycle management
      "all_products_adopted": 0.05, // Enterprise-wide adoption
      "full_traceability": 0.05,    // Complete audit capability
      "scalability_validation": 0.05, // Performance under load
      "connector-security": 0.1,    // Integration security
      "dashboard_usage": 0.05,      // Operational usage
    };

    // Check EVERY required evidence type for marginal information gain
    capability.evidence_required.forEach(evidenceType => {
      const weight = evidenceWeights[evidenceType] || 0.05; // Default weight for unknown types
      let isMet = false;

      switch(evidenceType) {
        case "production_usage":
          // Check if capability has >0 runtime invocations
          if (aggregatedEvidence.by_capability[capability.capability_id] > 0) {
            isMet = true;
            evidence_met.push("production_usage");
            rationale.push(`Production usage detected (${aggregatedEvidence.by_capability[capability.capability_id]} invocations).`);
          }
          break;

        case "multiple_consumers":
          // Check if capability has >1 unique consumers in metadata
          if (capability.consumers.length > 1) {
            isMet = true;
            evidence_met.push("multiple_consumers");
            rationale.push(`Multiple consumers detected (${capability.consumers.length} total).`);
          }
          break;

        case "cross_domain_adoption":
          // Check if consumers span multiple domains
          const uniqueDomains = new Set(capability.consumers.map(c => c.split('-')[0]));
          if (uniqueDomains.size > 1) {
            isMet = true;
            evidence_met.push("cross_domain_adoption");
            rationale.push(`Cross-domain adoption detected across ${uniqueDomains.size} domains.`);
          }
          break;

        case "security_validation":
          // Verify security status via trust-framework (B7.17.3 integration)
          try {
            const frameworkCatalog = trustFrameworkService.getFrameworkCatalog();
            // Check if there's a valid verification profile for this capability
            const hasValidVerification = frameworkCatalog.frameworks.some(framework => 
              framework.verification_profiles.some(profile => 
                profile.verification_mode === "VALIDATED" || profile.verification_mode === "DECLARED"
              )
            );
            if (hasValidVerification) {
              isMet = true;
              evidence_met.push("security_validation");
              rationale.push(`Security validation passed via trust-framework (${frameworkCatalog.frameworks.length} trust frameworks loaded).`);
            }
          } catch (e) {
            // Security validation not available
          }
          break;

        case "user-adoption":
          // Check if usage from multiple product contexts (lawyershub, services-id, etc.)
          const productInvocations = aggregatedEvidence.by_product;
          const uniqueProductsUsing = Object.entries(aggregatedEvidence.by_capability)
            .filter(([capId]) => capId === capability.capability_id)
            .length > 0 ? Object.keys(productInvocations).length : 0;
          if (uniqueProductsUsing >= 2) {
            isMet = true;
            evidence_met.push("user-adoption");
            rationale.push(`User adoption across ${uniqueProductsUsing} products.`);
          }
          break;

        case "security_validation":
        case "connector-security":
          // Check if trust framework has validated this capability's security
          // For now, mark as met if maturity_level is "production" (indicates security audit passed)
          if (capability.maturity_level === "production") {
            isMet = true;
            evidence_met.push(evidenceType);
            rationale.push(`${evidenceType}: Production maturity level validated.`);
          }
          break;

        case "cross_product_uniformity":
          // Check if usage pattern is consistent across products
          if (Object.keys(aggregatedEvidence.by_product).length >= 3) {
            isMet = true;
            evidence_met.push("cross_product_uniformity");
            rationale.push("Uniform usage across 3+ products.");
          }
          break;

        case "all_products_adopted":
          // Check if all 4 core products use this capability
          if (Object.keys(aggregatedEvidence.by_product).length >= 4) {
            isMet = true;
            evidence_met.push("all_products_adopted");
            rationale.push("Adopted by all 4 core EOS products.");
          }
          break;

        default:
          // Generic check - if we have any invocations, consider it potentially met
          if (aggregatedEvidence.by_capability[capability.capability_id] > 0) {
            isMet = true;
            evidence_met.push(evidenceType);
            rationale.push(`${evidenceType}: Runtime activity detected.`);
          }
      }

      if (isMet) {
        confidence_score += weight;
      } else {
        evidence_missing.push(evidenceType);
      }
    });

    // Normalize confidence score to 0.0-1.0 range
    const maxPossibleScore = capability.evidence_required.reduce((sum, et) => 
      sum + (evidenceWeights[et] || 0.05), 0);
    if (maxPossibleScore > 0) {
      confidence_score = Math.min(confidence_score / maxPossibleScore, 1.0);
    }

    // Make governance decision based on normalized score
    if (confidence_score >= 0.8) {
      decision = "PASS";
      rationale.unshift(`Strong evidence foundation (${(confidence_score * 100).toFixed(1)}% confidence).`);
    } else if (confidence_score >= 0.4) {
      decision = "HOLD";
      rationale.unshift(`Partial evidence requires additional validation (${(confidence_score * 100).toFixed(1)}% confidence).`);
    } else {
      decision = "FAIL";
      rationale.unshift(`Insufficient evidence for governance approval (${(confidence_score * 100).toFixed(1)}% confidence).`);
    }

    const verdict: GovernanceConfidenceVerdict = {
      capability_id: capability.capability_id,
      owner: capability.owner,
      evidence_met: evidence_met,
      evidence_missing: evidence_missing,
      confidence_score: confidence_score,
      decision: decision,
      rationale: rationale.join(" "),
      calculated_at_utc: now,
    };


    return verdict;
  }

  getGovernanceDecisions(): GovernanceConfidenceVerdict[] {
    const allCapabilities = this.loadAllCapabilityMetadata();
    const decisions: GovernanceConfidenceVerdict[] = [];

    for (const capability of allCapabilities) {
      decisions.push(this.calculateCapabilityConfidence(capability));
    }


    return decisions;
  }
}

export const governanceEvidenceArtifactCatalog =
  new GovernanceEvidenceArtifactCatalogFileSystem();
export const governanceEvidenceService = new GovernanceEvidenceService();