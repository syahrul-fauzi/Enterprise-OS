import { DigestEngine } from "@repo/core-kernel";

type JsonRecord = Record<string, unknown>;

export type ConstitutionLawBlockingStatus = "PASS" | "FAIL" | "UNVERIFIED";

export type ConstitutionPredicate = {
  readonly predicate_id: string;
  readonly description: string;
  readonly blocking: boolean;
};

export type ConstitutionProofResult = {
  readonly proof_id: string;
  readonly status: ConstitutionLawBlockingStatus;
  readonly report_key: string;
  readonly report_value: JsonRecord | readonly JsonRecord[];
  readonly report_digest: string;
};

export type ConstitutionLawResult = {
  readonly law_id: string;
  readonly description: string;
  readonly predicate: ConstitutionPredicate;
  readonly proof: ConstitutionProofResult;
  readonly blocking_status: ConstitutionLawBlockingStatus;
};

export type ConstitutionLaw<TInput> = {
  readonly law_id: string;
  readonly description: string;
  evaluate(input: TInput): ConstitutionLawResult;
};

export function createConstitutionLawResult(input: {
  readonly law_id: string;
  readonly description: string;
  readonly predicate_id?: string;
  readonly predicate_description?: string;
  readonly blocking?: boolean;
  readonly status: ConstitutionLawBlockingStatus;
  readonly report_key: string;
  readonly report_value: JsonRecord | readonly JsonRecord[];
}): ConstitutionLawResult {
  const predicateId = input.predicate_id ?? `${input.law_id}.predicate`;
  const reportDigest = DigestEngine.digest(input.report_value);

  return {
    law_id: input.law_id,
    description: input.description,
    predicate: {
      predicate_id: predicateId,
      description: input.predicate_description ?? input.description,
      blocking: input.blocking ?? true,
    },
    proof: {
      proof_id: `proof:${input.law_id}:${reportDigest.slice(0, 16)}`,
      status: input.status,
      report_key: input.report_key,
      report_value: input.report_value,
      report_digest: reportDigest,
    },
    blocking_status: input.status,
  };
}

export function runConstitutionLaws<TInput>(
  laws: readonly ConstitutionLaw<TInput>[],
  input: TInput,
): readonly ConstitutionLawResult[] {
  return laws.map((law) => law.evaluate(input));
}

export function indexLawResults(
  results: readonly ConstitutionLawResult[],
): JsonRecord {
  return Object.fromEntries(
    results.map((result) => [result.proof.report_key, result.proof.report_value]),
  );
}
