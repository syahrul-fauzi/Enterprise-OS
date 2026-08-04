import type { CertificationClaim, CertificationMatrixEnvelope, CertificationMilestoneTag, EvidencePackage, EvidencePackageIdentity, ClaimRelation, ClaimRelationKind, EvidenceId, ThreatToValidity, CertificationSnapshotId } from "./types";
import { type ExtendedEvidencePackage } from "./evidence";
declare const ALPHA6_EVIDENCE_PKGS: Readonly<Record<string, EvidencePackage>>;
export declare const EVIDENCE_ID_KEYS: Readonly<Record<string, keyof typeof ALPHA6_EVIDENCE_PKGS>>;
export declare const ALPHA_6_CLAIMS: Readonly<Record<string, CertificationClaim>>;
export declare function buildCertificationMatrix(milestone: CertificationMilestoneTag, extraClaims?: Readonly<Record<string, CertificationClaim>>, extraEvidence?: Readonly<Record<string, EvidencePackage>>, extraRelations?: readonly ClaimRelation[], extraProvenanceRegistry?: import("./types").CertificationMatrixEnvelope["provenanceRegistry"], extraExtendedPackages?: Readonly<Record<string, ExtendedEvidencePackage>>, extraDefinitionPairs?: ReadonlyArray<readonly [import("./types").ExperimentDefinition, import("./types").ExperimentDefinition]>): CertificationMatrixEnvelope;
export declare function alpha6Matrix(producedClaims?: Readonly<Record<string, CertificationClaim>>): CertificationMatrixEnvelope;
export declare function claimsSupportedBy(matrix: CertificationMatrixEnvelope, claimId: string): readonly CertificationClaim[];
export declare function claimsThatSupport(matrix: CertificationMatrixEnvelope, claimId: string): readonly CertificationClaim[];
export declare function claimDependencies(matrix: CertificationMatrixEnvelope, claimId: string): readonly CertificationClaim[];
export declare function claimDependents(matrix: CertificationMatrixEnvelope, claimId: string): readonly CertificationClaim[];
export declare function claimsForEvidenceId(matrix: CertificationMatrixEnvelope, evidenceId: EvidenceId): readonly CertificationClaim[];
export declare function contradictors(matrix: CertificationMatrixEnvelope, claimId: string): readonly ClaimRelation[];
export declare function superseding(matrix: CertificationMatrixEnvelope, claimId: string): readonly ClaimRelation[];
export declare function relationsSummary(matrix: CertificationMatrixEnvelope): Readonly<Record<ClaimRelationKind, number>>;
export interface ClaimLineage {
    readonly claimId: string;
    readonly evidenceIds: readonly EvidenceId[];
    readonly relationIds: readonly (string | undefined)[];
    readonly threats: readonly ThreatToValidity[];
    readonly mitigationExperiments: readonly (string | undefined)[];
    readonly supportsOutgoing: readonly string[];
    readonly supportsIncoming: readonly string[];
    readonly dependsOnOutgoing: readonly string[];
    readonly dependsOnIncoming: readonly string[];
    readonly futureClaimsUnlocked: readonly string[];
}
export declare function claimLineage(matrix: CertificationMatrixEnvelope, claimId: string): ClaimLineage | null;
export interface DependencyClosure {
    readonly closure: readonly string[];
    readonly edgePath: readonly (readonly [string, string])[];
}
export declare function dependencyClosure(matrix: CertificationMatrixEnvelope, claimId: string): DependencyClosure | null;
export interface EvidenceRevocationImpact {
    readonly revokedEvidenceId: EvidenceId;
    readonly directClaimIds: readonly string[];
    readonly affectedSubtreeClaimIds: readonly string[];
    readonly descendantEvidenceIds: readonly EvidenceId[];
}
export declare function evidenceRevocationImpact(matrix: CertificationMatrixEnvelope, evidenceId: EvidenceId): EvidenceRevocationImpact;
export interface SelfTestInvariantResult {
    readonly id: string;
    readonly passed: boolean;
    readonly message: string;
    readonly details?: readonly string[] | Readonly<Record<string, unknown>>;
}
export interface CertificationSelfTestReport {
    readonly passed: boolean;
    readonly total: number;
    readonly passedCount: number;
    readonly failedCount: number;
    readonly results: readonly SelfTestInvariantResult[];
}
export declare function runCertificationSelfTest(input: {
    readonly claims: Readonly<Record<string, CertificationClaim>>;
    readonly evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>;
    readonly claimRelations: readonly ClaimRelation[];
    readonly envelope?: CertificationMatrixEnvelope;
}): CertificationSelfTestReport;
export interface SnapshotDeltaResult {
    readonly idA: CertificationSnapshotId;
    readonly idB: CertificationSnapshotId;
    readonly identical: boolean;
    readonly changedDomains: readonly ("claims" | "evidencePackages" | "claimRelations" | "statuses" | "topology" | "meta")[];
    readonly statusUpgradesWithNoNewEvidence: readonly string[];
    readonly statusUpgradesValid: readonly string[];
    readonly formalDeltaEvidence: boolean;
}
export declare function compareCertificationSnapshots(oldEnv: CertificationMatrixEnvelope, newEnv: CertificationMatrixEnvelope): SnapshotDeltaResult;
export interface FullRevocationCascade {
    readonly revokedEvidenceId: EvidenceId;
    readonly directClaimIds: readonly string[];
    readonly recursiveClaimIds: readonly string[];
    readonly descendantEvidenceIds: readonly EvidenceId[];
    readonly impactedRelationIds: readonly string[];
    readonly snapshotImpact: {
        readonly wouldInvalidateSnapshotId: boolean;
        readonly claimsWithStatusAffected: readonly string[];
    };
}
export declare function computeFullRevocationCascade(env: CertificationMatrixEnvelope, evidenceId: EvidenceId): FullRevocationCascade;
export {};
//# sourceMappingURL=matrix.d.ts.map