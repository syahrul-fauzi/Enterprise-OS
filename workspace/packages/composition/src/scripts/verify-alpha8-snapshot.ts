//// =====================================================================
//// INDEPENDENT CERTIFICATION SNAPSHOT VERIFIER — EOS Alpha.8 (v2: rule-aligned)
////
//// DOKUMENTASI EPISTEMOLOGIS:
////   Verifier ini menggunakan RULE REFERENSI serialisasi dari:
////     packages/composition/src/canonical/serialize.ts → canonicalSerialize(input)
////
////   Itu ADALAH rule yang sama dengan framework, TAPI:
////   ✅ TIDAK PERNAH memanggil computeEvidenceIdSync / computeSnapshotIdSync /
////      computeRelationIdSync / computeGraphTopologyIdSync DARI framework.
////   ✅ Perhitungan SHA-256 identity ditulis ULANG di DALAM FILE INI
////      (crypto.createHash standalone dari node:crypto — bukan melalui
////       sha256HexSyncOrThrow yang dipakai oleh framework evidence.ts).
////   ✅ TIDAK menggunakan EvidenceId / RelationId / CertificationSnapshotId
////      BRAND TYPES — perbandingan identity menggunakan string literal biasa
////      (prefix "evd:sha256:", "rel:sha256:", "snp:sha256:" + 64 hex lowercase).
////
////   Jadi: "rule sama, engine berbeda".
////   Dua implementasi terpisah menghasilkan hash identity YANG SAMA →
////   bukti independen lebih kuat daripada "framework memverifikasi framework".
//// =====================================================================
//
//import fs from "node:fs";
//import path from "node:path";
//import crypto from "node:crypto";
//
//// RULE REFERENSI: pakai rule canonicalSerialize. Ini BUKAN identity compute.
//// Ini hanyalah aturan serialisasi yang DIPUBLIKASIKAN sebagai bagian dari
//// Evidence Identity Spec (sama seperti SHA-256 sebagai rule hash — publik).
//import { canonicalSerialize } from "../canonical/serialize";
//
//function showUsageAndExit(): never {
//  const me = path.relative(process.cwd(), process.argv[1] ?? __filename);
//  console.error("Usage:");
//  console.error(`  node --import tsx ${me} <path-to-alpha.8.snapshot.json>`);
//  process.exit(2);
//}
//
//// ──────────────────────────────────────────────────────────────────────
//// STANDALONE hashing (NOT framework sha256HexSyncOrThrow)
//// ──────────────────────────────────────────────────────────────────────
//function sha256hex(input: string): string {
//  return crypto.createHash("sha256").update(Buffer.from(input, "utf8")).digest("hex");
//}
//
//// ──────────────────────────────────────────────────────────────────────
//// STANDALONE canonicalEvidenceBundle rule (SAMA persis evidence.ts:127)
//// ──────────────────────────────────────────────────────────────────────
//function standaloneCanonicalEvidenceBundle(pkgJson: Record<string, unknown>): string {
//  const runnerRaw = pkgJson["runner"] as Record<string, unknown> | undefined;
//  const envelope = {
//    _schemaVersion: pkgJson["schemaVersion"] ?? null,
//    _packageVersion: pkgJson["packageVersion"] ?? null,
//    derivation: pkgJson["derivation"] ?? null,
//    derivedFromEvidenceIds: pkgJson["derivedFromEvidenceIds"] ?? [],
//    experimentId: pkgJson["experimentId"] ?? null,
//    experimentProtocol: pkgJson["experimentProtocol"] ?? null,
//    environmentConstraints: pkgJson["environmentConstraints"] ?? [],
//    assertionIds: pkgJson["assertionIds"] ?? [],
//    rawObservations: pkgJson["rawObservations"] ?? null,
//    hashConsistency: pkgJson["hashConsistency"] ?? [],
//    exitCode: pkgJson["exitCode"] !== undefined ? pkgJson["exitCode"] : null,
//    generatedBy: pkgJson["generatedBy"] ?? null,
//    evidenceSources: pkgJson["evidenceSources"] ?? null,
//    scriptFile: pkgJson["scriptFile"] !== undefined ? pkgJson["scriptFile"] : null,
//    functionName: pkgJson["functionName"] !== undefined ? pkgJson["functionName"] : null,
//    generatedAt: pkgJson["generatedAt"] ?? null,
//    gitCommit: pkgJson["gitCommit"] !== undefined ? pkgJson["gitCommit"] : null,
//    runner: runnerRaw ? {
//      os: runnerRaw["os"] ?? null,
//      arch: runnerRaw["arch"] ?? null,
//      runtime: runnerRaw["runtime"] ?? null,
//      runtimeVersion: runnerRaw["runtimeVersion"] ?? null,
//    } : null,
//    producerId: pkgJson["producerId"] !== undefined ? pkgJson["producerId"] : null,
//    producerName: pkgJson["producerName"] !== undefined ? pkgJson["producerName"] : null,
//    targetArtifactPath: pkgJson["targetArtifactPath"] !== undefined ? pkgJson["targetArtifactPath"] : null,
//    independentRun: pkgJson["independentRun"] !== undefined ? pkgJson["independentRun"] : null,
//  } as const;
//  return canonicalSerialize(envelope) as unknown as string;
//}
//
//// ──────────────────────────────────────────────────────────────────────
//// STANDALONE canonicalRelation rule (SAMA persis evidence.ts:268)
//// ──────────────────────────────────────────────────────────────────────
//function standaloneCanonicalRelation(rel: Record<string, unknown>): string {
//  const envelope = {
//    _schemaVersion: "1.0",
//    fromClaimId: rel["fromClaimId"] ?? null,
//    kind: rel["kind"] ?? null,
//    toClaimId: rel["toClaimId"] ?? null,
//    rationale: rel["rationale"] ?? "",
//  } as const;
//  return canonicalSerialize(envelope) as unknown as string;
//}
//
//// ──────────────────────────────────────────────────────────────────────
//// STANDALONE sortedClaimRelations + canonicalSnapshotBundle
//// SAMA persis evidence.ts:320 & evidence.ts:333
//// ──────────────────────────────────────────────────────────────────────
//function standaloneSortedClaimRelations(rels: ReadonlyArray<Record<string, unknown>>): ReadonlyArray<Record<string, unknown>> {
//  return [...rels].sort((a, b) => {
//    const ka = `${String(a["fromClaimId"])}|${String(a["kind"])}|${String(a["toClaimId"])}`;
//    const kb = `${String(b["fromClaimId"])}|${String(b["kind"])}|${String(b["toClaimId"])}`;
//    if (ka < kb) return -1;
//    if (ka > kb) return 1;
//    const ra = typeof a["rationale"] === "string" ? a["rationale"] : "";
//    const rb = typeof b["rationale"] === "string" ? b["rationale"] : "";
//    return ra.localeCompare(rb);
//  });
//}
//
//function standaloneCanonicalSnapshotBundle(env: Record<string, unknown>): string {
//  const hashable = {
//    protocolVersion: env["protocolVersion"] ?? null,
//    epistemicProtocolVersion: env["epistemicProtocolVersion"] ?? null,
//    evidenceSchemaVersion: env["evidenceSchemaVersion"] ?? null,
//    relationLayerRules: env["relationLayerRules"] ?? null,
//    evidenceLayers: env["evidenceLayers"] ?? null,
//    layerLifecycle: env["layerLifecycle"] ?? null,
//    layerStatusSemantics: env["layerStatusSemantics"] ?? null,
//    producedAt: env["producedAt"] ?? null,
//    milestone: env["milestone"] ?? null,
//    claims: env["claims"] ?? null,
//    evidencePackages: env["evidencePackages"] ?? null,
//    claimRelations: standaloneSortedClaimRelations(
//      (env["claimRelations"] as ReadonlyArray<Record<string, unknown>> | undefined) ?? [],
//    ),
//    graphTopology: env["graphTopology"] ?? null,
//    summary: env["summary"] ?? null,
//    overall: env["overall"] ?? null,
//  } as const;
//  return canonicalSerialize(hashable) as unknown as string;
//}
//
//type VerifyResult = {
//  readonly ok: boolean;
//  readonly snapshotIdStored: string | null;
//  readonly snapshotIdRecomputed: string;
//  readonly canonicalBundleLength: number;
//  readonly claimCount: number;
//  readonly evidencePackageCount: number;
//  readonly relationCount: number;
//  readonly invariantChecks: Readonly<Record<string, boolean>>;
//};
//
//function verifySnapshotFile(filePath: string): VerifyResult {
//  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
//  if (!fs.existsSync(absPath)) {
//    console.error(`[FATAL] File tidak ditemukan: ${absPath}`);
//    process.exit(3);
//  }
//  const rawBytes = fs.readFileSync(absPath);
//  const rawJson = JSON.parse(rawBytes.toString("utf8")) as Record<string, unknown>;
//
//  const storedIdRaw = rawJson["snapshotId"];
//  const storedId: string | null = typeof storedIdRaw === "string" ? storedIdRaw : null;
//
//  const snapshotCanonical = standaloneCanonicalSnapshotBundle(rawJson);
//  const recomputedId = `snp:sha256:${sha256hex(snapshotCanonical)}`;
//  const idMatch = storedId === recomputedId;
//
//  const invariantChecks: Record<string, boolean> = {};
//  invariantChecks["FILESYSTEM: file exists and readable as JSON"] = true;
//  invariantChecks["BRAND: snapshotId matches snp:sha256:<64hex>"] =
//    storedId !== null && /^snp:sha256:[0-9a-f]{64}$/.test(storedId);
//  invariantChecks[
//    "IDENTITY: recomputed SNAPSHOT_ID (STANDALONE rule === evidence.ts:333) === stored snapshotId"
//  ] = idMatch;
//
//  const claims = rawJson["claims"] as Record<string, unknown> | undefined;
//  const evPkgs = rawJson["evidencePackages"] as Record<string, Record<string, unknown>> | undefined;
//  const rels = rawJson["claimRelations"] as ReadonlyArray<Record<string, unknown>> | undefined;
//  invariantChecks["STRUCTURE: claims is object (Record)"] = typeof claims === "object" && claims !== null && !Array.isArray(claims);
//  invariantChecks["STRUCTURE: evidencePackages is object (Record)"] = typeof evPkgs === "object" && evPkgs !== null && !Array.isArray(evPkgs);
//  invariantChecks["STRUCTURE: claimRelations is array"] = Array.isArray(rels);
//
//  const claimCount = claims ? Object.keys(claims).length : 0;
//  const evidencePackageCount = evPkgs ? Object.keys(evPkgs).length : 0;
//  const relationCount = rels ? rels.length : 0;
//  invariantChecks["SANITY: claimCount ≥ 1 (snapshot minimal non-empty)"] = claimCount >= 1;
//  invariantChecks["SANITY: evidencePackages ≥ 1"] = evidencePackageCount >= 1;
//
//  let evidenceIdentityOkCount = 0;
//  let evidenceIdentityTotal = 0;
//  if (evPkgs) {
//    for (const [pkgKey, entry] of Object.entries(evPkgs)) {
//      const idStored = typeof entry["id"] === "string" ? entry["id"] : null;
//      const pkgObj = entry["pkg"] as Record<string, unknown> | undefined;
//      if (!idStored || !pkgObj) continue;
//      evidenceIdentityTotal++;
//      try {
//        const pkgCanon = standaloneCanonicalEvidenceBundle(pkgObj);
//        const expectedId = `evd:sha256:${sha256hex(pkgCanon)}`;
//        if (idStored === expectedId) evidenceIdentityOkCount++;
//      } catch {
//        /* skip */
//      }
//    }
//  }
//  invariantChecks[`EVIDENCE_IDENTITY: ${evidenceIdentityOkCount}/${evidenceIdentityTotal} EvidenceId match (standalone bundle rule)`] =
//    evidenceIdentityTotal > 0 && evidenceIdentityOkCount === evidenceIdentityTotal;
//
//  let relIdentityOk = 0;
//  let relIdentityTotal = 0;
//  if (Array.isArray(rels)) {
//    for (const rel of rels) {
//      const stored = typeof rel["id"] === "string" ? rel["id"] : null;
//      if (!stored) continue;
//      relIdentityTotal++;
//      const relCanon = standaloneCanonicalRelation(rel);
//      const expected = `rel:sha256:${sha256hex(relCanon)}`;
//      if (stored === expected) relIdentityOk++;
//    }
//  }
//  invariantChecks[`RELATION_IDENTITY: ${relIdentityOk}/${relIdentityTotal} RelationId match (standalone rule _schemaVersion=1.0)`] =
//    relIdentityTotal > 0 && relIdentityOk === relIdentityTotal;
//
//  return {
//    ok: idMatch,
//    snapshotIdStored: storedId,
//    snapshotIdRecomputed: recomputedId,
//    canonicalBundleLength: Buffer.from(snapshotCanonical, "utf8").length,
//    claimCount,
//    evidencePackageCount,
//    relationCount,
//    invariantChecks: Object.freeze(invariantChecks),
//  };
//}
//
//function main(): number {
//  const args = process.argv.slice(2);
//  if (args.length < 1) showUsageAndExit();
//  const file = args[0]!;
//  const result = verifySnapshotFile(file);
//
//  const w = 96;
//  const border = "─".repeat(w);
//  console.log(`┌${border}┐`);
//  console.log(`│ INDEPENDENT VERIFIER v2 — Certification Snapshot Identity`.padEnd(w + 1) + "│");
//  console.log(`│ (rule-aligned: canonicalSerialize reference rule, BUT identity compute STANDALONE)`.padEnd(w + 1) + "│");
//  console.log(`│ computeSnapshotIdSync/computeEvidenceIdSync/computeRelationIdSync TIDAK DIPANGGIL`.padEnd(w + 1) + "│");
//  console.log(`├${border}┤`);
//  console.log(`│ File                               │ ${path.relative(process.cwd(), path.resolve(file))}`.padEnd(w + 1) + "│");
//  console.log(`│ Canonical Bundle Byte Length       │ ${String(result.canonicalBundleLength).padStart(14)} bytes`.padEnd(w + 1) + "│");
//  console.log(`│ Claim Count                        │ ${String(result.claimCount).padStart(14)}`.padEnd(w + 1) + "│");
//  console.log(`│ Evidence Package Count             │ ${String(result.evidencePackageCount).padStart(14)}`.padEnd(w + 1) + "│");
//  console.log(`│ Claim Relation Count               │ ${String(result.relationCount).padStart(14)}`.padEnd(w + 1) + "│");
//  console.log(`├${border}┤`);
//  const stored = result.snapshotIdStored ?? "(TIDAK TERSEDIA)";
//  const ok = result.snapshotIdStored === result.snapshotIdRecomputed;
//  console.log(`│ STORED    snapshotId               │ ${stored.slice(0, 78)}`.padEnd(w + 1) + "│");
//  if (stored.length > 78) console.log(`│                                    │ ${stored.slice(78)}`.padEnd(w + 1) + "│");
//  console.log(`│ RECOMPUTED snapshotId (STANDALONE) │ ${result.snapshotIdRecomputed.slice(0, 78)}`.padEnd(w + 1) + "│");
//  if (result.snapshotIdRecomputed.length > 78) console.log(`│                                    │ ${result.snapshotIdRecomputed.slice(78)}`.padEnd(w + 1) + "│");
//  console.log(
//    `│ MATCH (2 implementasi BERBEDA rule sama)│ ${ok ? "✅ YA — Provenance Valid. Snapshot ID dapat direproduksi." : "❌ TIDAK — Periksa rule serialisasi atau modifikasi luar."}`.padEnd(w + 1) + "│",
//  );
//  console.log(`├${border}┤`);
//  console.log(`│ INDEPENDENT VERIFICATION CHECKLIST │`.padEnd(w + 1) + "│");
//  console.log(`├${border}┤`);
//  let allPassed = true;
//  for (const [checkName, passed] of Object.entries(result.invariantChecks)) {
//    const mark = passed ? "✅" : "❌";
//    if (!passed) allPassed = false;
//    const name = `${mark} ${checkName}`;
//    const padded = name.padEnd(w - 2);
//    console.log(`│ ${padded} │`);
//  }
//  console.log(`├${border}┤`);
//  const verdict = ok && allPassed;
//  const line1 = verdict
//    ? `✅ VERIFICATION PASSED — Snapshot, Evidence, Relation identity DAPAT DIPRODUKSI ULANG dengan implementasi hash BERBEDA.`
//    : `❌ VERIFICATION FAILED — Periksa identity dengan mismatch.`;
//  console.log((`│ ${line1}` + " ".repeat(w)).slice(0, w) + " │");
//  console.log(`└${border}┘`);
//  console.log();
//  console.log("Catatan epistemologis (penting):");
//  console.log("  1. Verifier MENGGUNAKAN rule canonicalSerialize (karena rule adalah PUBLIK).");
//  console.log("  2. TETAPI hashing identity dan bundle envelope EVIDENCE/RELATION/SNAPSHOT");
//  console.log("     ditulis ULANG SECARA TERPIHAK di dalam file ini (TIDAK import compute* dari");
//  console.log("     packages/composition/src/certification/evidence.ts).");
//  console.log("  3. Hasil IDENTIK antara framework generate vs verifier standalone → tingkat");
//  console.log("     keyakinan lebih tinggi daripada self-test framework tunggal.");
//  console.log();
//  return verdict ? 0 : 1;
//}
//
//process.exit(main());
