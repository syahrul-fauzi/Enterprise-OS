import assert from "node:assert/strict";
import test from "node:test";

import {
  assertKnownSpecificationMaturityStatus,
  compareSpecificationMaturityStatus,
  loadSpecificationMaturityModel,
  meetsSpecificationMaturityFloor,
} from "../src/specification-maturity-runtime.js";

test("specification maturity model is loaded from governance artifact", () => {
  const model = loadSpecificationMaturityModel();

  assert.equal(model.model_id, "specification-maturity-model");
  assert.equal(model.initial_status, "Draft");
  assert.equal(model.policy_floors.conformance_baseline_minimum, "Conformant");
  assert.deepEqual(
    model.statuses.map((entry) => entry.status),
    [
      "Draft",
      "Proposed",
      "Accepted",
      "Implemented",
      "Conformant",
      "Verified",
      "Stable",
      "Deprecated",
    ],
  );
});

test("specification maturity comparison is governance-driven", () => {
  assert.ok(meetsSpecificationMaturityFloor("Conformant", "Conformant"));
  assert.ok(meetsSpecificationMaturityFloor("Verified", "Conformant"));
  assert.equal(meetsSpecificationMaturityFloor("Implemented", "Conformant"), false);
  assert.equal(compareSpecificationMaturityStatus("Accepted", "Implemented") < 0, true);
});

test("unknown specification maturity status is rejected by governance runtime", () => {
  assert.throws(
    () => assertKnownSpecificationMaturityStatus("Certified"),
    /Unknown specification maturity status: Certified/,
  );
});
