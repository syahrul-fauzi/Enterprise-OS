import assert from "node:assert/strict";
import test from "node:test";
import { connectorEcosystemService } from "../implementation/services/connector-ecosystem.service.js";

test("connector ecosystem lists first connectors", () => {
  const connectors = connectorEcosystemService.listConnectors();
  assert.ok(connectors.length >= 3);
});

test("connector ecosystem exports requirement data", async () => {
  const result = await connectorEcosystemService.sync({ connectorId: "requirements-json-export" });
  assert.equal(result.status, "completed");
  assert.ok(result.exportedCount > 0);
});

test("connector ecosystem syncs evidence data", async () => {
  const result = await connectorEcosystemService.sync({ connectorId: "evidence-registry-sync" });
  assert.equal(result.status, "completed");
  assert.ok(result.exportedCount > 0);
});