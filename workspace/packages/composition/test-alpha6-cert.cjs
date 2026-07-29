const cert = require("./dist/certification/index.js");
const evidence = require("./dist/certification/evidence.js");

const {
  alpha6Matrix, runCertificationSelfTest,
  claimLineage, dependencyClosure, evidenceRevocationImpact,
} = cert;
const { computeEvidenceIdSync, computeGraphTopologyIdSync, verifyEvidenceIdentity, verifyRelationIdentity, computeRelationIdSync } = evidence;

console.log("=== EOS EPISTEMIC PROTOCOL v5.0 — ALPHA.6 CERTIFICATION EXECUTION EVIDENCE ===\n");
let matrix;
try {
  matrix = alpha6Matrix();
  console.log("✅ [STAGE 1] buildCertificationMatrix() SUCCESS — self-test failsafe passed, envelope produced");
} catch (e) {
  console.error("❌ Matrix production FAILED:", e.message);
  process.exit(1);
}

console.log("\n=== ENVELOPE METADATA ===");
console.log("epistemicProtocolVersion:", matrix.epistemicProtocolVersion);
console.log("evidenceSchemaVersion:", matrix.evidenceSchemaVersion);
console.log("graphTopology.algorithm:", matrix.graphTopology.algorithm);
console.log("graphTopology.schemaVersion:", matrix.graphTopology.schemaVersion);
console.log("graphTopology.claimCount:", matrix.graphTopology.claimCount);
console.log("graphTopology.relationCount:", matrix.graphTopology.relationCount);
console.log("graphTopology.id:", matrix.graphTopology.id);
console.log("claims total:", Object.keys(matrix.claims).length);
console.log("evidencePackages total:", Object.keys(matrix.evidencePackages).length);
console.log("claimRelations total:", matrix.claimRelations.length);

console.log("\n=== STAGE 3: EVIDENCE IDENTITY VERIFICATION (SHA-256 RECOMPUTE) ===");
const pkgs = Object.entries(matrix.evidencePackages);
let okPkg = 0, failPkg = 0;
for (const [pkgKey, ident] of pkgs) {
  const verify = verifyEvidenceIdentity(ident);
  if (verify.ok) {
    okPkg++;
    const shortId = String(ident.id).slice(0, 32) + "…";
    console.log("  ✅ " + pkgKey.padEnd(30) + " " + shortId + "  derivation=" + ident.pkg.derivation.padEnd(9) + " schema=" + ident.schemaVersion);
  } else {
    failPkg++;
    console.error("  ❌ " + pkgKey + ": expected=" + verify.expected + " recomputed=" + verify.recomputedId);
  }
}
console.log("\n  Evidence Identity: " + okPkg + "/" + pkgs.length + " packages VERIFIED — recompute hash === stored hash ✅");

console.log("\n=== STAGE 4: GRAPH TOPOLOGY IDENTITY VERIFICATION ===");
const recomputed = computeGraphTopologyIdSync(matrix.claims, matrix.claimRelations);
if (recomputed.id === matrix.graphTopology.id) {
  console.log("  ✅ Graph Topology ID VERIFIED");
  console.log("     Stored id   = " + matrix.graphTopology.id);
  console.log("     Recomputed  = " + recomputed.id);
  console.log("     Match = YES");
} else {
  console.error("  ❌ Graph topology mismatch");
  process.exit(2);
}

console.log("\n=== STAGE 4B: CLAIM RELATION IDENTITY VERIFICATION (Per-Edge SHA-256) ===");
const rels = matrix.claimRelations;
let okRel = 0, failRel = 0, noidRel = 0;
const uniqueRids = new Set();
for (const r of rels) {
  const label = `${r.fromClaimId} --[${r.kind}]--> ${r.toClaimId}`;
  if (!r.id) {
    noidRel++;
    console.error("  ⚠️  NO-ID: " + label);
    continue;
  }
  uniqueRids.add(String(r.id));
  const v = verifyRelationIdentity(r);
  if (v.ok) {
    okRel++;
    const short = String(r.id).slice(0, 24) + "…";
    console.log("  ✅ " + short + "  " + label);
  } else {
    failRel++;
    console.error("  ❌ " + label + ": expected=" + String(v.expected).slice(0, 24) + "… recomputed=" + String(v.recomputedId).slice(0, 24) + "…");
  }
}
console.log("\n  Relation Identity: " + okRel + "/" + rels.length + " VERIFIED (unique=" + uniqueRids.size + ", no-id=" + noidRel + ", fail=" + failRel + ")");
if (uniqueRids.size !== rels.length) console.error("  ⚠️  WARNING: relation IDs not unique (" + uniqueRids.size + " distinct for " + rels.length + " relations)");

console.log("\n=== STAGE 5: CERTIFICATION SELF-TEST (INDEPENDENT RE-RUN) ===");
const report = runCertificationSelfTest({
  claims: matrix.claims,
  evidencePackages: matrix.evidencePackages,
  claimRelations: matrix.claimRelations,
});
console.log("  Self-Test: " + (report.passed ? "✅ PASSED" : "❌ FAILED") + "  (" + report.passedCount + "/" + report.total + " invariants)");
for (const r of report.results) {
  const icon = r.passed ? "✅" : "❌";
  console.log("     " + icon + " [" + r.id.padEnd(38) + "] " + (r.passed ? "PASS" : "FAIL") + " — " + r.message);
  if (!r.passed && r.details) {
    for (const d of r.details) console.log("        ↳ " + d);
  }
}

console.log("\n=== STAGE 6: RELATION LAYER RULES COMPLIANCE ===");
const ruleCounts = {};
for (const r of matrix.claimRelations) {
  const from = matrix.claims[r.fromClaimId];
  const to = matrix.claims[r.toClaimId];
  if (!from || !to) continue;
  const key = r.kind + ": " + from.evidenceLevel + " → " + to.evidenceLevel;
  ruleCounts[key] = (ruleCounts[key] || 0) + 1;
}
for (const k of Object.keys(ruleCounts).sort()) {
  console.log("  " + k.padEnd(42) + " x" + ruleCounts[k]);
}

console.log("\n=== STAGE 7: EVIDENCE DERIVATION CLASSIFICATION ===");
const deriv = { Raw: 0, Derived: 0, Aggregate: 0 };
for (const ident of Object.values(matrix.evidencePackages)) deriv[ident.pkg.derivation]++;
console.log("  Raw (primer observasi)        : " + deriv.Raw);
console.log("  Derived (sekunder perhitungan): " + deriv.Derived);
console.log("  Aggregate (summary report)    : " + deriv.Aggregate);

console.log("\n=== STAGE 8: EPISTEMIC STACK SUMMARY ===");
const S = matrix.summary;
console.log("  Execution:");
console.log("    PASS=" + S.Execution.PASS + "  FAIL=" + S.Execution.FAIL + "  (resolved=" + matrix.overall.executionResolved.length + ", unresolved=" + matrix.overall.executionUnresolved.length + ")");
console.log("    → executionAllResolved = " + matrix.overall.executionAllResolved);
console.log("  Architectural:");
console.log("    Supported=" + S.Architectural.Supported + "  Pending=" + S.Architectural.Pending + "  Refuted=" + S.Architectural.Refuted);
console.log("    → hypotheses: [" + matrix.overall.architecturalHypotheses.join(", ") + "]");
console.log("  Evolutionary:");
console.log("    Planned=" + S.Evolutionary.Planned + "  Running=" + S.Evolutionary.Running + "  Verified=" + S.Evolutionary.Verified + "  Refuted=" + S.Evolutionary.Refuted);
console.log("    → claims: [" + matrix.overall.evolutionaryClaims.join(", ") + "]");

console.log("\n=== STAGE 9: TRACEABILITY FIRST-CLASS (dependency closure & evidence revocation) ===");
const a7Claim = "a7.runtime.boundary.only-consumes-resolved-workspace";
const lin = claimLineage(matrix, a7Claim);
if (!lin) { console.error("  ❌ claimLineage gagal untuk " + a7Claim); process.exit(11); }
console.log("  ✅ claimLineage(\"" + a7Claim + "\"):");
console.log("     evidenceIds           : " + lin.evidenceIds.length + " items");
console.log("     supports incoming     : " + lin.supportsIncoming.length + " (Execution → Architectural supports direction)");
console.log("     supports outgoing     : " + lin.supportsOutgoing.length);
console.log("     dependsOn outgoing    : " + lin.dependsOnOutgoing.length + " (=" + JSON.stringify(lin.dependsOnOutgoing) + ")");
console.log("     dependsOn incoming    : " + lin.dependsOnIncoming.length);
console.log("     futureClaimsUnlocked  : " + JSON.stringify(lin.futureClaimsUnlocked));
console.log("     mitigationExperiments : " + lin.mitigationExperiments.length);

const cl = dependencyClosure(matrix, "evo.product-composition.multi-workspace");
if (!cl) { console.error("  ❌ dependencyClosure gagal"); process.exit(12); }
console.log("\n  ✅ dependencyClosure(\"evo.product-composition.multi-workspace\"):");
console.log("     closure node count = " + cl.closure.length);
console.log("     traversal path: " + JSON.stringify(cl.closure));
console.log("     edgeCount        = " + cl.edgePath.length);

const rawRuntimeEid = Object.values(matrix.evidencePackages).find(x => x.pkg.experimentId === "EXP-A7-RUNTIME-PACKAGE-EXISTS");
if (!rawRuntimeEid) { console.error("  ❌ evidence revocation target tidak ditemukan (EXP-A7-RUNTIME-PACKAGE-EXISTS missing)"); process.exit(13); }
const impact = evidenceRevocationImpact(matrix, rawRuntimeEid.id);
console.log("\n  ✅ evidenceRevocationImpact(revoke " + String(rawRuntimeEid.id).slice(0, 24) + "… [A7 runtime package exists raw]):");
console.log("     directClaimIds        : " + JSON.stringify(impact.directClaimIds));
console.log("     affectedSubtree size  : " + impact.affectedSubtreeClaimIds.length + " claims (include all upstream supports/dependsOn chain)");
console.log("     affectedSubtree list  : " + JSON.stringify(impact.affectedSubtreeClaimIds));
console.log("     descendantEvidenceIds : " + impact.descendantEvidenceIds.length);

console.log("\n=== FINAL RESULT ===");
if (report.passed && okPkg === pkgs.length && recomputed.id === matrix.graphTopology.id && failPkg === 0 && failRel === 0 && noidRel === 0 && okRel === rels.length) {
  console.log("🎯 ALL STAGES PASSED. Alpha.6 Certification Matrix v5.0 — STRUCTURE INTEGRITAS TERBUKTI.");
  console.log("   ✅ Evidence Identity (" + okPkg + "/" + pkgs.length + ")");
  console.log("   ✅ Graph Topology Identity");
  console.log("   ✅ Claim Relation Identity (" + okRel + "/" + rels.length + ")");
  console.log("   ✅ Self-Test Invariants (" + report.passedCount + "/" + report.total + ")");
  process.exit(0);
} else {
  console.error("❌ Some stage FAILED. See errors above.");
  process.exit(10);
}
