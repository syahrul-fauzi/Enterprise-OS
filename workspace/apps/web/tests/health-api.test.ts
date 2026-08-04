import assert from "node:assert/strict";
import test from "node:test";
import { GET as getHealth } from "../app/api/health/route";

test("apps/web health API reports runtime health and product context", async () => {
  const response = await getHealth(
    new Request("http://localhost/api/health", {
      headers: {
        "x-eos-product-id": "ilc",
        "x-eos-product-domain": "indonesialawyersclub.id",
        "x-forwarded-host": "indonesialawyersclub.id",
      },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-eos-product-id"), "ilc");
  assert.equal(
    response.headers.get("x-eos-product-domain"),
    "indonesialawyersclub.id",
  );

  const payload = await response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "apps/web");
  assert.equal(payload.product.productId, "ilc");
  assert.equal(
    payload.product.productDomain,
    "indonesialawyersclub.id",
  );
});
