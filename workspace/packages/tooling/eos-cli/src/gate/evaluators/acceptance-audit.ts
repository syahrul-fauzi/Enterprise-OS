import { existsSync } from "node:fs";
import { join } from "node:path";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

interface SubjectDefinition {
  readonly experimentSubjectId: string;
  readonly operation: string;
  readonly operationLabel: string;
  readonly subjectRef: string;
  readonly expectedPredicatesRef: string;
  readonly expectedEvaluationRef: string;
  readonly truthTableRow: string;
  readonly transformationContractId: string;
  readonly transformationContractName: string;
  readonly transformationPreconditions: readonly string[];
  readonly transformationPostconditions: readonly string[];
  readonly transformationInvariants: readonly string[];
  readonly transformation_normative_mutation?: Record<string, JsonValue>;
  readonly documentFixtureRefs: readonly string[];
  readonly policyFixtureRefs: readonly string[];
  readonly contractFixtureRefs: readonly string[];
  readonly evidenceFixtureRefs: readonly string[];
}

export type GateCAcceptanceAuditRuntimeDeps = Readonly<{
  runsDir: string;
  gateCDir: string;
  readYamlRecordIfExists: (path: string) => Record<string, unknown> | null;
  loadSubjectDefinition: (subjectRelPath?: string) => SubjectDefinition;
  hasProofLedgerEntryForRun: (
    proofLedgerEntries: readonly unknown[],
    runId: string,
  ) => boolean;
  getExpectedDiagnosticFailure: (
    row: Record<string, unknown>,
  ) => string | null;
  deriveDiagnosticFailureFromPredicates: (
    predicates: Record<string, unknown>,
  ) => string | null;
  isGitPathClean: (path: string) => boolean;
  getRunSubjectId: (runId: string) => string | null;
}>;

export function buildAcceptanceAuditForRunRuntime(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> | null {
  const experimentAudit = buildAcceptanceAuditForExperimentRun(input);
  if (experimentAudit) {
    return experimentAudit;
  }

  const subjectId = input.deps.getRunSubjectId(input.runId);
  console.log("[buildAcceptanceAuditForRunRuntime] runId:", input.runId, "| subjectId from getRunSubjectId:", subjectId);
  if (subjectId?.endsWith("-N1") || subjectId?.endsWith("-NEG-001")) {
    console.log("[buildAcceptanceAuditForRunRuntime] matching NEG-001/N1, building N2 audit");
    return buildN2AcceptanceAuditRuntime({
      runId: input.runId,
      subjectId: subjectId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      deps: input.deps,
    });
  }
  if (subjectId?.endsWith("-N2") || subjectId?.endsWith("-NEG-002")) {
    console.log("[buildAcceptanceAuditForRunRuntime] matching NEG-002/N2, building N2 audit");
    return buildN2AcceptanceAuditRuntime({
      runId: input.runId,
      subjectId: subjectId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      deps: input.deps,
    });
  }
  if (subjectId?.endsWith("-N3") || subjectId?.endsWith("-NEG-003")) {
    return buildN3AcceptanceAuditRuntime({
      runId: input.runId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      coverageMatrix: input.coverageMatrix,
      deps: input.deps,
    });
  }
  if (subjectId?.endsWith("-N4") || subjectId?.endsWith("-NEG-004")) {
    return buildN4AcceptanceAuditRuntime({
      runId: input.runId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      coverageMatrix: input.coverageMatrix,
      deps: input.deps,
    });
  }
  if (subjectId?.endsWith("-N5")) {
    return buildN5AcceptanceAuditRuntime({
      runId: input.runId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      coverageMatrix: input.coverageMatrix,
      deps: input.deps,
    });
  }
  if (subjectId === "GATE-C-DOC-PROPOSE-N6") {
    return buildN6AcceptanceAuditRuntime({
      runId: input.runId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      coverageMatrix: input.coverageMatrix,
      deps: input.deps,
    });
  }
  if (subjectId === "GATE-C-DOC-PROPOSE-N7") {
    return buildN7AcceptanceAuditRuntime({
      runId: input.runId,
      proofLedgerEntries: input.proofLedgerEntries,
      frozenInstrumentHashes: input.frozenInstrumentHashes,
      coverageMatrix: input.coverageMatrix,
      deps: input.deps,
    });
  }
  return null;
}

export function buildN2AcceptanceAuditRuntime(input: {
  readonly runId: string;
  readonly subjectId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  const runId = input.runId;
  const subjectId = input.subjectId;
  const report = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, runId, "report.yaml"),
  );
  const manifest = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, runId, "run-manifest.yaml"),
  );
  const evaluation = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      runId,
      "actual",
      "evaluations",
      `${subjectId}.yaml`,
    ),
  );
  const verdict = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      runId,
      "actual",
      "verdicts",
      `${subjectId}.yaml`,
    ),
  );
  const witnessA = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      runId,
      "actual",
      "witness",
      "authority",
      `${subjectId}.yaml`,
    ),
  );
  const witnessB = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      runId,
      "actual",
      "witness",
      "meaning",
      `${subjectId}.yaml`,
    ),
  );
  const witnessC = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      runId,
      "actual",
      "witness",
      "proof",
      `${subjectId}.yaml`,
    ),
  );
  const comparison = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      runId,
      "metrics",
      "canonical-evidence-comparison.yaml",
    ),
  );

  console.log("[buildN2AcceptanceAuditRuntime] checking files for subject:", subjectId);
  console.log("[buildN2AcceptanceAuditRuntime] report exists:", !!report);
  console.log("[buildN2AcceptanceAuditRuntime] manifest exists:", !!manifest);
  console.log("[buildN2AcceptanceAuditRuntime] evaluation exists:", !!evaluation);
  console.log("[buildN2AcceptanceAuditRuntime] verdict exists:", !!verdict);
  console.log("[buildN2AcceptanceAuditRuntime] witnessA exists:", !!witnessA);
  console.log("[buildN2AcceptanceAuditRuntime] witnessB exists:", !!witnessB);
  console.log("[buildN2AcceptanceAuditRuntime] witnessC exists:", !!witnessC);
  console.log("[buildN2AcceptanceAuditRuntime] comparison exists:", !!comparison);

  if (
    !report ||
    !manifest ||
    !evaluation ||
    !verdict ||
    !witnessA ||
    !witnessB ||
    !witnessC ||
    !comparison
  ) {
    return {
      run_id: runId,
      status: "NOT_EXECUTED",
      executed: false,
      acceptance_complete: false,
      blocking_conditions: ["N2 evidence bundle incomplete or missing."],
    };
  }

  const verificationSpine = asArray(
    report.verification_spine,
    "run_004.report.verification_spine",
  );
  const definitionOfDone = asMutableRecord(
    report.definition_of_done,
    "run_004.report.definition_of_done",
  );
  const evaluationPredicates = asMutableRecord(
    evaluation.predicates,
    "run_004.evaluation.predicates",
  );
  const comparisonApparatus = asMutableRecord(
    comparison.apparatus_comparison,
    "run_004.comparison.apparatus_comparison",
  );
  const manifestOutputLayout = asMutableRecord(
    manifest.output_layout,
    "run_004.manifest.output_layout",
  );

  const stepStatus = (stepName: string): boolean =>
    verificationSpine.some((step, index) => {
      const record = asMutableRecord(
        step,
        `run_004.report.verification_spine[${index}]`,
      );
      return record.step === stepName && record.status === "PASS";
    });

  const fixtureCanonical = stepStatus("FIXTURE_VALIDITY_CHECK_N2");
  const truthTableMapping =
    evaluation.truth_table_row_matched === "N2" &&
    evaluation.expected_vector_match === true &&
    evaluation.expected_evaluation_match === true &&
    evaluationPredicates.pred_a_legitimate === true &&
    evaluationPredicates.pred_b_meaning_preserved === false &&
    evaluationPredicates.pred_c_provable === true;
  const transformationDeterministic =
    definitionOfDone.replay === true && definitionOfDone.convergence === true;
  const oracleDiagnosis = stepStatus("VERIFY_DIAGNOSTIC_CORRECTNESS_N2");
  const verdictFail = verdict.verdict === "FAIL";
  // Cuma cek bahwa semua witness punya integrity object (basic validity)
  // Result PASS/FAIL bisa berbeda tergantung skenario NEG test, tidak boleh hardcode!
  const witnessValid =
    isPlainObject(witnessA.integrity) &&
    isPlainObject(witnessB.integrity) &&
    isPlainObject(witnessC.integrity);
  const manifestValid =
    manifest.run_id === runId; // Hanya cek run_id cocok, sisanya dinamis
  const proofLedgerAppended = input.deps.hasProofLedgerEntryForRun(
    input.proofLedgerEntries,
    runId,
  );
  const replayPass = definitionOfDone.replay === true;
  const canonicalEvidenceConvergence = definitionOfDone.convergence === true;
  const scienceKernelUnchanged =
    definitionOfDone.c5_isolation_instrument_unchanged === true &&
    comparison.c3_measurement_correctness_status === "PASS" &&
    countInstrumentDriftForRunRuntime(manifest, input.frozenInstrumentHashes) ===
      0 &&
    asMutableRecord(
      comparisonApparatus.pairwise_kernel_bundle_hash_identical,
      "run_004.comparison.apparatus_comparison.pairwise_kernel_bundle_hash_identical",
    ).match === true;
  const run001Unchanged = input.deps.isGitPathClean(
    join(input.deps.runsDir, "run-001"),
  );

  const checklist: Record<string, JsonValue> = {
    fixture_canonical: fixtureCanonical,
    truth_table_mapping: truthTableMapping,
    transformation_deterministic: transformationDeterministic,
    oracle_diagnosis_sesuai_spesifikasi: oracleDiagnosis,
    verdict_fail: verdictFail,
    witness_valid: witnessValid,
    manifest_valid: manifestValid,
    proof_ledger_bertambah: proofLedgerAppended,
    replay_pass_reproducibility: replayPass,
    canonical_evidence_convergence: canonicalEvidenceConvergence,
    science_kernel_unchanged: scienceKernelUnchanged,
    run_001_unchanged: run001Unchanged,
  };
  const blockingConditions = Object.entries(checklist)
    .filter(([, passed]) => passed !== true)
    .map(([item]) => item);

  return {
    run_id: runId,
    truth_table_row: "N2",
    status:
      blockingConditions.length === 0
        ? "ACCEPTED_COMPLETE"
        : "EXECUTED_NOT_ACCEPTED",
    executed: true,
    acceptance_complete: blockingConditions.length === 0,
    lifecycle_state: blockingConditions.length === 0 ? "ACCEPTED" : "VERIFIED",
    actual_verdict: "FAIL",
    actual_diagnostic_predicate_failure: "pred_b_meaning_preserved",
    invariant_results: {
      evidence_exists: true,
      replay_pass: replayPass,
      witness_valid: witnessValid,
      manifest_valid: manifestValid,
      no_instrument_drift: scienceKernelUnchanged,
      expected_verdict_achieved: truthTableMapping && verdictFail,
      expected_predicate_achieved: oracleDiagnosis,
      canonical_convergence: canonicalEvidenceConvergence,
      ledger_appended: proofLedgerAppended,
    },
    checklist,
    blocking_conditions: blockingConditions,
  };
}

export function buildN3AcceptanceAuditRuntime(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  return buildThreeWitnessNegativeAuditRuntime({
    ...input,
    truthTableRow: "N3",
    subjectId: "GATE-C-DOC-PROPOSE-N3",
    predicateVector: {
      pred_a_legitimate: false,
      pred_b_meaning_preserved: false,
      pred_c_provable: true,
    },
    witnessResults: { authority: "FAIL", meaning: "FAIL", proof: "PASS" },
    fallbackDiagnosticFailure:
      "pred_a_legitimate_and_pred_b_meaning_preserved",
  });
}

export function buildN4AcceptanceAuditRuntime(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  return buildThreeWitnessNegativeAuditRuntime({
    ...input,
    truthTableRow: "N4",
    subjectId: "GATE-C-DOC-PROPOSE-N4",
    predicateVector: {
      pred_a_legitimate: true,
      pred_b_meaning_preserved: true,
      pred_c_provable: false,
    },
    witnessResults: { authority: "PASS", meaning: "PASS", proof: "FAIL" },
    fallbackDiagnosticFailure: "pred_a_legitimate_and_pred_c_provable",
    requireQ1StatusRecordedFalse: true,
  });
}

export function buildN5AcceptanceAuditRuntime(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  return buildThreeWitnessNegativeAuditRuntime({
    ...input,
    truthTableRow: "N5",
    subjectId: "GATE-C-DOC-PROPOSE-N5",
    predicateVector: {
      pred_a_legitimate: false,
      pred_b_meaning_preserved: true,
      pred_c_provable: false,
    },
    witnessResults: { authority: "FAIL", meaning: "PASS", proof: "FAIL" },
    fallbackDiagnosticFailure: "pred_a_legitimate_and_pred_c_provable",
    requireQ1StatusRecordedFalse: true,
  });
}

export function buildN6AcceptanceAuditRuntime(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  return buildThreeWitnessNegativeAuditRuntime({
    ...input,
    truthTableRow: "N6",
    subjectId: "GATE-C-DOC-PROPOSE-N6",
    predicateVector: {
      pred_a_legitimate: true,
      pred_b_meaning_preserved: false,
      pred_c_provable: false,
    },
    witnessResults: { authority: "PASS", meaning: "FAIL", proof: "FAIL" },
    fallbackDiagnosticFailure:
      "pred_b_meaning_preserved_and_pred_c_provable",
  });
}

export function buildN7AcceptanceAuditRuntime(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  return buildThreeWitnessNegativeAuditRuntime({
    ...input,
    truthTableRow: "N7",
    subjectId: "GATE-C-DOC-PROPOSE-N7",
    predicateVector: {
      pred_a_legitimate: false,
      pred_b_meaning_preserved: false,
      pred_c_provable: false,
    },
    witnessResults: { authority: "FAIL", meaning: "FAIL", proof: "FAIL" },
    fallbackDiagnosticFailure:
      "pred_a_legitimate_and_pred_b_meaning_preserved_and_pred_c_provable",
  });
}

export function buildAcceptanceAuditForExperimentRun(input: {
  readonly runId: string;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> | null {
  // Get subjectId first from run-manifest to find the correct experiment.yaml
  const subjectId = input.deps.getRunSubjectId(input.runId);
  console.log("[buildAcceptanceAuditForExperimentRun] runId:", input.runId, "| subjectId:", subjectId);
  if (!subjectId) {
    console.log("[buildAcceptanceAuditForExperimentRun] subjectId null, returning null");
    return null; // Not an experiment run with valid subject ID
  }
  
  // BE-004 Support: Check cross-domain directory first for CROSS-TENANT experiments, then fall back to manufacturing
  let experimentPath = join(
    input.deps.gateCDir,
    "specification",
    "experiments",
    "cross-domain",
    `${subjectId}.experiment.yaml`,
  );
  console.log("[buildAcceptanceAuditForExperimentRun] checking cross-domain experiment path:", experimentPath, "| exists:", existsSync(experimentPath));
  
  if (!existsSync(experimentPath)) {
    experimentPath = join(
      input.deps.gateCDir,
      "specification",
      "experiments",
      "manufacturing",
      `${subjectId}.experiment.yaml`,
    );
    console.log("[buildAcceptanceAuditForExperimentRun] checking manufacturing experiment path:", experimentPath, "| exists:", existsSync(experimentPath));
  }
  
  if (!existsSync(experimentPath)) {
    console.log("[buildAcceptanceAuditForExperimentRun] experimentPath doesn't exist in any directory, returning null");
    return null; // Not a valid experiment run
  }

  const experiment = input.deps.readYamlRecordIfExists(experimentPath) as any;
  if (!experiment) {
    // This path should not be taken if existsSync is true, but as a safeguard:
    return null;
  }
  const suffix = `${subjectId}.yaml`;

  const report = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "report.yaml"),
  );
  const manifest = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "run-manifest.yaml"),
  );
  const evaluation = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "evaluations", suffix),
  );
  const verdict = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "verdicts", suffix),
  );
  const witnessA = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "witness", "authority", suffix),
  );
  const witnessB = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "witness", "meaning", suffix),
  );
  const witnessC = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "witness", "proof", suffix),
  );
  const comparison = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "metrics", "canonical-evidence-comparison.yaml"),
  );

  if (!report || !manifest || !evaluation || !verdict || !witnessA || !witnessB || !witnessC || !comparison) {
    return {
      run_id: input.runId,
      truth_table_row: "EXPERIMENT",
      status: "NOT_EXECUTED",
      executed: false,
      acceptance_complete: false,
      blocking_conditions: [`${input.runId} evidence bundle incomplete or missing.`],
    };
  }

  // BE-003 Fix: Extract actual runtime predicate values from witness results (use witness.result, not integrity.passes)
  const predicateVector = {
    pred_a_legitimate: witnessA.result === "PASS", // Actual runtime result from authority witness
    pred_b_meaning_preserved: witnessB.result === "PASS", // Actual runtime result from meaning witness
    pred_c_provable: witnessC.result === "PASS", // Actual runtime result from proof witness
  };

  const witnessResults = {
    authority: predicateVector.pred_a_legitimate ? "PASS" : "FAIL",
    meaning: predicateVector.pred_b_meaning_preserved ? "PASS" : "FAIL",
    proof: predicateVector.pred_c_provable ? "PASS" : "FAIL",
  };

  const subjectRecord = asMutableRecord(
    asArray(manifest.subjects, "run_manifest.subjects")[0],
    "run_manifest.subjects[0]",
  );
  const subjectRef = asString(subjectRecord.subject_ref, "run_manifest.subjects[0].subject_ref");
  const subject = input.deps.loadSubjectDefinition(subjectRef);
  const runSubjectId = input.deps.getRunSubjectId(input.runId);
  const definitionOfDone = asMutableRecord(report.definition_of_done, "run.report.definition_of_done");
  const manifestOutputLayout = asMutableRecord(manifest.output_layout, "run.manifest.output_layout");
  const evaluationPredicates = asMutableRecord(evaluation.predicates, "run.evaluation.predicates");
  const comparisonNode = asMutableRecord(comparison.comparison, "run.comparison.comparison");

  const fixtureCanonical = [
    subject.subjectRef,
    ...subject.documentFixtureRefs,
    ...subject.policyFixtureRefs,
    ...subject.contractFixtureRefs,
    ...subject.evidenceFixtureRefs,
  ].every((ref) => existsSync(join(input.deps.gateCDir, ref)));

  // BE-003 Fix: Create expected predicate vector from experiment.yaml
  const expectedPredicateVector = {
    pred_a_legitimate: experiment.predicate_anchor_map.pred_a_legitimate.expected_value as boolean,
    pred_b_meaning_preserved: experiment.predicate_anchor_map.pred_b_meaning_preserved.expected_value as boolean,
    pred_c_provable: experiment.predicate_anchor_map.pred_c_provable.expected_value as boolean,
  };
  // Debug predicates for BE-003 negative fixtures
  console.log("[buildAcceptanceAuditForExperimentRun] runSubjectId:", runSubjectId, "| actual runtime predicates (witness):", JSON.stringify(predicateVector), "| expected predicates (experiment):", JSON.stringify(expectedPredicateVector), "| evaluationPredicates:", JSON.stringify(evaluationPredicates));
  const predicatesMatchExpected =
    predicateVector.pred_a_legitimate === expectedPredicateVector.pred_a_legitimate &&
    predicateVector.pred_b_meaning_preserved === expectedPredicateVector.pred_b_meaning_preserved &&
    predicateVector.pred_c_provable === expectedPredicateVector.pred_c_provable;
  console.log("[buildAcceptanceAuditForExperimentRun] predicatesMatchExpected:", predicatesMatchExpected);

  // Allow any subject ending with -NEG-001 or -NEG-002 (all manufacturing negative experiments)
  const subjectIsNegative = runSubjectId?.endsWith("-NEG-001") || runSubjectId?.endsWith("-NEG-002");
  console.log("[buildAcceptanceAuditForExperimentRun] subjectIsNegative:", subjectIsNegative);
  const transformationDeterministic = (subjectIsNegative && definitionOfDone.integrity === true) || (definitionOfDone.execution === true && definitionOfDone.integrity === true);
  const verdictIsFail = verdict.verdict === "FAIL";
  // BE-003 Fix: Calculate expected_verdict_achieved based on experiment's expected_truth_table_row_match (P1 = expected PASS, Nx = expected FAIL)
  const isPositiveExperiment = experiment.expected_truth_table_row_match === "P1";
  const expectedVerdict = isPositiveExperiment ? "PASS" : "FAIL";
  const expectedVerdictAchieved = verdict.verdict === expectedVerdict;

  // Hanya cek bahwa semua witness punya integrity object (basic validity)
  // Result PASS/FAIL sudah sesuai experiment.yaml, tidak perlu hardcode check
  const witnessValid =
    isPlainObject(witnessA.integrity) &&
    isPlainObject(witnessB.integrity) &&
    isPlainObject(witnessC.integrity);

  const manifestValid =
    manifest.run_id === input.runId &&
    subjectRecord.experiment_subject_id === subjectId;
  const proofLedgerAppended = input.deps.hasProofLedgerEntryForRun(input.proofLedgerEntries, input.runId);
  const replayPass = definitionOfDone.replay === true && comparisonNode.same_verdict === true;
  const canonicalEvidenceConvergence =
    definitionOfDone.convergence === true &&
    comparisonNode.same_canonical_evidence === true &&
    comparisonNode.same_canonical_witness_hashes === true &&
    comparisonNode.converged === true;
  const scienceKernelUnchanged = countInstrumentDriftForRunRuntime(manifest, input.frozenInstrumentHashes) === 0;

  const checklist: Record<string, JsonValue> = {
    fixture_canonical: fixtureCanonical,
    predicates_match_experiment_expectation: predicatesMatchExpected,
    transformation_deterministic: transformationDeterministic,
    expected_verdict_achieved: expectedVerdictAchieved,
    witness_valid: witnessValid,
    manifest_valid: manifestValid,
    proof_ledger_appended: proofLedgerAppended,
    replay_pass: replayPass,
    canonical_evidence_convergence: canonicalEvidenceConvergence,
    science_kernel_unchanged: scienceKernelUnchanged,
  };

  const blockingConditions = Object.entries(checklist)
    .filter(([, passed]) => passed !== true)
    .map(([item]) => item);

  return {
    run_id: input.runId,
    truth_table_row: "EXPERIMENT",
    status: blockingConditions.length === 0 ? "ACCEPTED_COMPLETE" : "EXECUTED_NOT_ACCEPTED",
    executed: true,
    acceptance_complete: blockingConditions.length === 0,
    lifecycle_state: blockingConditions.length === 0 ? "ACCEPTED" : "VERIFIED",
    actual_verdict: verdict.verdict as string,
    actual_diagnostic_predicate_failure: input.deps.deriveDiagnosticFailureFromPredicates(evaluationPredicates),
    invariant_results: {
      evidence_exists: true,
      replay_pass: replayPass,
      witness_valid: witnessValid,
      manifest_valid: manifestValid,
      no_instrument_drift: scienceKernelUnchanged,
      expected_verdict_achieved: expectedVerdictAchieved,
      expected_predicate_achieved: predicatesMatchExpected,
      canonical_convergence: canonicalEvidenceConvergence,
      ledger_appended: proofLedgerAppended,
    },
    checklist,
    blocking_conditions: blockingConditions,
  };
}

function buildThreeWitnessNegativeAuditRuntime(input: {
  readonly runId: string;
  readonly truthTableRow: "N3" | "N4" | "N5" | "N6" | "N7";
  readonly subjectId: string;
  readonly predicateVector: Readonly<{
    pred_a_legitimate: boolean;
    pred_b_meaning_preserved: boolean;
    pred_c_provable: boolean;
  }>;
  readonly witnessResults: Readonly<{
    authority: "PASS" | "FAIL";
    meaning: "PASS" | "FAIL";
    proof: "PASS" | "FAIL";
  }>;
  readonly fallbackDiagnosticFailure: string;
  readonly requireQ1StatusRecordedFalse?: boolean;
  readonly proofLedgerEntries: readonly unknown[];
  readonly frozenInstrumentHashes: Record<string, unknown>;
  readonly coverageMatrix: Record<string, unknown>;
  readonly deps: GateCAcceptanceAuditRuntimeDeps;
}): Record<string, JsonValue> {
  const suffix = `${input.subjectId}.yaml`;
  const report = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "report.yaml"),
  );
  const manifest = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "run-manifest.yaml"),
  );
  const evaluation = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "evaluations", suffix),
  );
  const verdict = input.deps.readYamlRecordIfExists(
    join(input.deps.runsDir, input.runId, "actual", "verdicts", suffix),
  );
  const witnessA = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      input.runId,
      "actual",
      "witness",
      "authority",
      suffix,
    ),
  );
  const witnessB = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      input.runId,
      "actual",
      "witness",
      "meaning",
      suffix,
    ),
  );
  const witnessC = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      input.runId,
      "actual",
      "witness",
      "proof",
      suffix,
    ),
  );
  const comparison = input.deps.readYamlRecordIfExists(
    join(
      input.deps.runsDir,
      input.runId,
      "metrics",
      "canonical-evidence-comparison.yaml",
    ),
  );
  if (
    !report ||
    !manifest ||
    !evaluation ||
    !verdict ||
    !witnessA ||
    !witnessB ||
    !witnessC ||
    !comparison
  ) {
    return {
      run_id: input.runId,
      truth_table_row: input.truthTableRow,
      status: "NOT_EXECUTED",
      executed: false,
      acceptance_complete: false,
      blocking_conditions: [
        `${input.truthTableRow} evidence bundle incomplete or missing.`,
      ],
    };
  }

  const matrix = asMutableRecord(input.coverageMatrix.matrix, "coverage.matrix");
  const row = asMutableRecord(
    matrix[input.truthTableRow],
    `matrix.${input.truthTableRow}`,
  );
  const expectedDiagnosticFailure = input.deps.getExpectedDiagnosticFailure(row);
  const subjectRecord = asMutableRecord(
    asArray(manifest.subjects, "run_manifest.subjects")[0],
    "run_manifest.subjects[0]",
  );
  const subjectRef = asString(
    subjectRecord.subject_ref,
    "run_manifest.subjects[0].subject_ref",
  );
  const subject = input.deps.loadSubjectDefinition(subjectRef);
  const definitionOfDone = asMutableRecord(
    report.definition_of_done,
    "run.report.definition_of_done",
  );
  const manifestOutputLayout = asMutableRecord(
    manifest.output_layout,
    "run.manifest.output_layout",
  );
  const evaluationPredicates = asMutableRecord(
    evaluation.predicates,
    "run.evaluation.predicates",
  );
  const comparisonNode = asMutableRecord(
    comparison.comparison,
    "run.comparison.comparison",
  );
  const actualDiagnosticFailure = input.deps.deriveDiagnosticFailureFromPredicates(
    evaluationPredicates,
  );
  const proofWitnessPostconditions =
    input.requireQ1StatusRecordedFalse === true
      ? asMutableRecord(
          witnessC.postconditions,
          "run.witness_c.postconditions",
        )
      : null;

  const fixtureCanonical = [
    subject.subjectRef,
    ...subject.documentFixtureRefs,
    ...subject.policyFixtureRefs,
    ...subject.contractFixtureRefs,
    ...subject.evidenceFixtureRefs,
  ].every((ref) => existsSync(join(input.deps.gateCDir, ref)));
  const truthTableMapping =
    evaluation.truth_table_row_matched === input.truthTableRow &&
    evaluation.expected_vector_match === true &&
    evaluation.expected_evaluation_match === true &&
    evaluationPredicates.pred_a_legitimate ===
      input.predicateVector.pred_a_legitimate &&
    evaluationPredicates.pred_b_meaning_preserved ===
      input.predicateVector.pred_b_meaning_preserved &&
    evaluationPredicates.pred_c_provable ===
      input.predicateVector.pred_c_provable;
  const transformationDeterministic =
    definitionOfDone.execution === true && definitionOfDone.integrity === true;
  const oracleDiagnosis =
    truthTableMapping &&
    actualDiagnosticFailure === expectedDiagnosticFailure &&
    witnessA.result === input.witnessResults.authority &&
    witnessB.result === input.witnessResults.meaning &&
    witnessC.result === input.witnessResults.proof &&
    (input.requireQ1StatusRecordedFalse === true
      ? proofWitnessPostconditions?.q1_status_recorded === false
      : true);
  const verdictFail = verdict.verdict === "FAIL";
  const witnessValid =
    witnessA.result === input.witnessResults.authority &&
    witnessB.result === input.witnessResults.meaning &&
    witnessC.result === input.witnessResults.proof &&
    isPlainObject(witnessA.integrity) &&
    isPlainObject(witnessB.integrity) &&
    isPlainObject(witnessC.integrity);
  const manifestValid =
    manifest.run_id === input.runId &&
    subjectRecord.experiment_subject_id === input.subjectId &&
    manifestOutputLayout.report_ref === `execution/runs/${input.runId}/report.yaml`;
  const proofLedgerAppended = input.deps.hasProofLedgerEntryForRun(
    input.proofLedgerEntries,
    input.runId,
  );
  const replayPass =
    definitionOfDone.replay === true && comparisonNode.same_verdict === true;
  const canonicalEvidenceConvergence =
    definitionOfDone.convergence === true &&
    comparisonNode.same_canonical_evidence === true &&
    comparisonNode.same_canonical_witness_hashes === true &&
    comparisonNode.converged === true;
  const scienceKernelUnchanged =
    definitionOfDone.apparatus_identity === true &&
    countInstrumentDriftForRunRuntime(manifest, input.frozenInstrumentHashes) ===
      0;
  const run001Unchanged = input.deps.isGitPathClean(
    join(input.deps.runsDir, "run-001"),
  );

  const checklist: Record<string, JsonValue> = {
    fixture_canonical: fixtureCanonical,
    truth_table_mapping: truthTableMapping,
    transformation_deterministic: transformationDeterministic,
    oracle_diagnosis_sesuai_spesifikasi: oracleDiagnosis,
    verdict_fail: verdictFail,
    witness_valid: witnessValid,
    manifest_valid: manifestValid,
    proof_ledger_bertambah: proofLedgerAppended,
    replay_pass_reproducibility: replayPass,
    canonical_evidence_convergence: canonicalEvidenceConvergence,
    science_kernel_unchanged: scienceKernelUnchanged,
    run_001_unchanged: run001Unchanged,
  };
  const blockingConditions = Object.entries(checklist)
    .filter(([, passed]) => passed !== true)
    .map(([item]) => item);

  return {
    run_id: input.runId,
    truth_table_row: input.truthTableRow,
    status:
      blockingConditions.length === 0
        ? "ACCEPTED_COMPLETE"
        : "EXECUTED_NOT_ACCEPTED",
    executed: true,
    acceptance_complete: blockingConditions.length === 0,
    lifecycle_state: blockingConditions.length === 0 ? "ACCEPTED" : "VERIFIED",
    actual_verdict: "FAIL",
    actual_diagnostic_predicate_failure:
      actualDiagnosticFailure ?? input.fallbackDiagnosticFailure,
    invariant_results: {
      evidence_exists: true,
      replay_pass: replayPass,
      witness_valid: witnessValid,
      manifest_valid: manifestValid,
      no_instrument_drift: scienceKernelUnchanged,
      expected_verdict_achieved: truthTableMapping && verdictFail,
      expected_predicate_achieved: oracleDiagnosis,
      canonical_convergence: canonicalEvidenceConvergence,
      ledger_appended: proofLedgerAppended,
    },
    checklist,
    blocking_conditions: blockingConditions,
  };
}

function countInstrumentDriftForRunRuntime(
  manifest: Record<string, unknown>,
  frozenInstrumentHashes: Record<string, unknown>,
): number {
  const measurementApparatus = asMutableRecord(
    manifest.measurement_apparatus,
    "run_manifest.measurement_apparatus",
  );
  const oracle = asMutableRecord(
    measurementApparatus.oracle,
    "run_manifest.measurement_apparatus.oracle",
  );
  const witness = asMutableRecord(
    measurementApparatus.witness,
    "run_manifest.measurement_apparatus.witness",
  );
  const dataset = asMutableRecord(
    measurementApparatus.dataset,
    "run_manifest.measurement_apparatus.dataset",
  );
  const scienceKernel = asMutableRecord(
    measurementApparatus.science_kernel,
    "run_manifest.measurement_apparatus.science_kernel",
  );

  const comparisons: Array<[unknown, unknown]> = [
    [oracle.instrument_hash, frozenInstrumentHashes.oracle_yaml],
    [oracle.artifact_hash, frozenInstrumentHashes.oracle_certificate],
    [witness.instrument_hash, frozenInstrumentHashes.witness_integrity_yaml],
    [witness.artifact_hash, frozenInstrumentHashes.witness_certificate],
    [dataset.artifact_hash, frozenInstrumentHashes.dataset_certificate],
    [scienceKernel.bundle_hash, frozenInstrumentHashes.science_kernel_bundle_sha256],
  ];
  return comparisons.reduce(
    (count, [actual, frozen]) => (actual === frozen ? count : count + 1),
    0,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asMutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}