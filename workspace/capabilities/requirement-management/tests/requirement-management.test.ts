import test from "node:test";
import assert from "node:assert/strict";
import {
  requirementService,
} from "../implementation/service";

test("requirement management supports lifecycle from create to verify", () => {
  const created = requirementService.createRequirement({
    title: "REQ lifecycle test",
    owner: "QA Agent",
    linkedCapabilityIds: ["EOS-001"],
    acceptanceCriteria: ["Requirement can be verified"],
  });

  const approved = requirementService.approveRequirement({ id: created.id });
  assert.equal(approved.status, "approved");

  const inDelivery = requirementService.startRequirementDelivery({ id: created.id });
  assert.equal(inDelivery.status, "in_delivery");

  const implemented = requirementService.markRequirementImplemented({ id: created.id });
  assert.equal(implemented.status, "implemented");

  const verified = requirementService.verifyRequirement({ id: created.id });
  assert.equal(verified.status, "verified");
  assert.equal(verified.verificationStatus, "passed");
});

test("requirement search filters by linked capability and owner", () => {
  const result = requirementService.searchRequirements({
    linkedCapabilityId: "EOS-001",
    owner: "Architecture",
    limit: 20,
    offset: 0,
  });

  assert.ok(result.total >= result.matched);
  assert.ok(result.items.length >= 1);
  assert.ok(result.items.every((item) => item.linkedCapabilityIds.includes("EOS-001")));
});
