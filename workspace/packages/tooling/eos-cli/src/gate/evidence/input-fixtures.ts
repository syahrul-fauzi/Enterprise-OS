import type { GateCRunComparisonJsonValue } from "./run-comparison.js";
import { createFilesystemYamlEvidenceSource } from "./sources/filesystem-yaml-source.js";

export type GateCInputFixtureSubject = Readonly<{
  documentFixtureRefs: readonly string[];
  policyFixtureRefs: readonly string[];
  contractFixtureRefs: readonly string[];
  evidenceFixtureRefs: readonly string[];
}>;

export type GateCLoadedInputFixtures = Readonly<{
  document: Readonly<{
    title: string;
    classification: string;
    retention_period_days: number;
    proposer_identity_ref: string;
    body: string;
    metadata: Record<string, GateCRunComparisonJsonValue>;
  }>;
  policy: Readonly<{
    policy_id: string;
    roles_allowed_propose: readonly string[];
  }>;
  contract: Readonly<{
    contract_id: string;
    derives_authority_from_policy_ref: string;
    operations: Record<string, GateCRunComparisonJsonValue>;
  }>;
  proposalStatus: string;
  proposerRole: string;
  proofEvidenceIds: readonly string[];
}>;

export type GateCInputFixtureDeps = Readonly<{
  gateCDir: string;
  readYamlRecord: (path: string) => Record<string, unknown>;
  asMutableRecord: (value: unknown, label: string) => Record<string, unknown>;
  asArray: (value: unknown, label: string) => unknown[];
  asString: (value: unknown, label: string) => string;
  asNumber: (value: unknown, label: string) => number;
  asStringArray: (value: unknown, label: string) => readonly string[];
  canonicalizeValue: (value: unknown) => GateCRunComparisonJsonValue;
}>;

export function loadGateCInputFixtures(
  subject: GateCInputFixtureSubject,
  deps: GateCInputFixtureDeps,
): GateCLoadedInputFixtures {
  const fixtureSource = createFilesystemYamlEvidenceSource({
    rootDir: deps.gateCDir,
    readYamlRecord: deps.readYamlRecord,
  });
  const documentFixture = fixtureSource.read(subject.documentFixtureRefs[0] ?? "");
  const policyFixture = fixtureSource.read(subject.policyFixtureRefs[0] ?? "");
  const contractFixture = fixtureSource.read(subject.contractFixtureRefs[0] ?? "");
  const evidenceFixture = fixtureSource.read(subject.evidenceFixtureRefs[0] ?? "");

  const document = deps.asMutableRecord(documentFixture.document, "document");
  const policy = deps.asMutableRecord(policyFixture.policy, "policy");
  const contract = deps.asMutableRecord(contractFixture.contract, "contract");
  const evidenceItems = deps.asArray(evidenceFixture.evidence_items, "evidence_items");

  const proofEvidenceIds = evidenceItems.map((item, index) => {
    const record = deps.asMutableRecord(item, `evidence_items[${index}]`);
    return deps.asString(record.id, `evidence_items[${index}].id`);
  });

  const proposalEntry = deps.asMutableRecord(evidenceItems[0], "evidence_items[0]");
  const proposalEntryData = deps.asMutableRecord(
    proposalEntry.data,
    "evidence_items[0].data",
  );
  const roleEntry = deps.asMutableRecord(evidenceItems[1], "evidence_items[1]");
  const roleEntryData = deps.asMutableRecord(roleEntry.data, "evidence_items[1].data");

  return {
    document: {
      title: deps.asString(document.title, "document.title"),
      classification: deps.asString(document.classification, "document.classification"),
      retention_period_days: deps.asNumber(
        document.retention_period_days,
        "document.retention_period_days",
      ),
      proposer_identity_ref: deps.asString(
        document.proposer_identity_ref,
        "document.proposer_identity_ref",
      ),
      body: deps.asString(document.body, "document.body"),
      metadata: deps.canonicalizeValue(
        deps.asMutableRecord(document.metadata, "document.metadata"),
      ) as Record<string, GateCRunComparisonJsonValue>,
    },
    policy: {
      policy_id: deps.asString(policy.policy_id, "policy.policy_id"),
      roles_allowed_propose: deps.asStringArray(
        deps.asMutableRecord(policy.access_control, "policy.access_control")
          .roles_allowed_propose,
        "policy.access_control.roles_allowed_propose",
      ),
    },
    contract: {
      contract_id: deps.asString(contract.contract_id, "contract.contract_id"),
      derives_authority_from_policy_ref: deps.asString(
        contract.derives_authority_from_policy_ref,
        "contract.derives_authority_from_policy_ref",
      ),
      operations: deps.canonicalizeValue(
        deps.asMutableRecord(contract.operations, "contract.operations"),
      ) as Record<string, GateCRunComparisonJsonValue>,
    },
    proposalStatus: deps.asString(
      proposalEntryData.recorded_status,
      "proposal recorded_status",
    ),
    proposerRole: deps.asString(roleEntryData.role_attested, "proposal role_attested"),
    proofEvidenceIds,
  };
}
