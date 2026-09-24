import { describe, it } from "node:test";
import assert from "node:assert";
import { loadCurrentJourney, getContextAnchor, loadGovernanceState, saveCurrentJourney, EOS_ROOT } from "../src/state.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JOURNEY_ENGINE_ID = "journey-engine";

// Load existing journey first to get valid state for testing
const originalJourney = loadCurrentJourney();

describe("EJ004-W06: Backward Compatibility Verification", () => {
  describe("Core State Functions (all existing consumers must work)", () => {
    it("loadCurrentJourney() imports and executes successfully", () => {
      const journey = loadCurrentJourney();
      assert.ok(journey, "loadCurrentJourney returns valid state");
      assert.equal(journey.work_id, "EOS-JOURNEY-003", "Current journey work_id is correct (EOS-JOURNEY-003 is still canonical active work, EJ004 is next_work_id)");
    });

    it("getContextAnchor() imports and executes successfully", () => {
      const anchor = getContextAnchor();
      assert.ok(anchor.governanceState, "Context Anchor loads governance state");
      assert.ok(anchor.currentJourney, "Context Anchor loads current journey");
    });

    it("loadGovernanceState() imports and executes successfully", () => {
      const governance = loadGovernanceState();
      assert.ok(governance, "loadGovernanceState returns valid state");
    });

    it("EOS_ROOT path is exported and valid", () => {
      assert.ok(EOS_ROOT, "EOS_ROOT is exported from state.ts");
      assert.equal(typeof EOS_ROOT, "string", "EOS_ROOT is a string");
    });
  });

  describe("Authorization Boundaries (W05 enforcement)", () => {
    it("Rejects unauthorized mutation attempt (non-Journey Engine actor)", () => {
      const invalidActor = "random-actor-123";
      const testState = JSON.parse(JSON.stringify(originalJourney));
      
      try {
        saveCurrentJourney(invalidActor, testState);
        assert.fail("Should have thrown unauthorized error");
      } catch (e) {
        const error = e as Error;
        assert.ok(error.message.includes("UNAUTHORIZED"), "Error contains UNATHORIZED message");
        assert.ok(error.message.includes(JOURNEY_ENGINE_ID), "Error mentions only Journey Engine has authority");
      }
    });

    it("Allows authorized mutation attempt (Journey Engine actor)", () => {
      const testState = JSON.parse(JSON.stringify(originalJourney));
      // Make a trivial change to test state (will be reverted immediately)
      testState.test_mutation_timestamp = new Date().toISOString();
      
      try {
        saveCurrentJourney(JOURNEY_ENGINE_ID, testState);
        assert.ok(true, "Authorized mutation was accepted");
        // Revert back to original state
        saveCurrentJourney(JOURNEY_ENGINE_ID, originalJourney);
      } catch (e) {
        const error = e as Error;
        assert.fail(`Authorized mutation failed: ${error.message}`);
      }
    });
  });

  describe("Golden Spine Invariant Enforcement (W04 enforcement)", () => {
    it("Rejects state with empty string next_work_id", () => {
      const invalidState = JSON.parse(JSON.stringify(originalJourney));
      invalidState.next_work_id = "";
      
      try {
        saveCurrentJourney(JOURNEY_ENGINE_ID, invalidState);
        assert.fail("Should have thrown invariant violation error");
      } catch (e) {
        const error = e as Error;
        // Zod schema first validates string min length, then our invariant re-checks it
        assert.ok(error.message.includes("VALIDATION FAILED") || error.message.includes("INVARIANT VIOLATION"), "Error contains either schema validation or invariant violation");
      }
    });

    it("Rejects state with null next_work_id", () => {
      const invalidState = JSON.parse(JSON.stringify(originalJourney));
      invalidState.next_work_id = null;
      
      try {
        saveCurrentJourney(JOURNEY_ENGINE_ID, invalidState);
        assert.fail("Should have thrown invariant violation error");
      } catch (e) {
        // Zod schema will catch null first, which is correct
        const error = e as Error;
        assert.ok(error.message.includes("VALIDATION FAILED"), "Schema catches invalid null next_work_id");
      }
    });
  });
});