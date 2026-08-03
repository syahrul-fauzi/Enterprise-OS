import { createHash } from "node:crypto";

export type DigestHashAlgorithm = "sha256";
export type DigestCanonicalizer = (value: unknown) => unknown;

export type DigestComputation = {
  readonly algorithm: DigestHashAlgorithm;
  readonly canonical_value: unknown;
  readonly canonical_json: string;
  readonly digest: string;
};

export type DigestEngineContract = {
  readonly algorithm: DigestHashAlgorithm;
  canonicalize(value: unknown): unknown;
  serialize(value: unknown): string;
  digest(value: unknown): string;
  digestText(value: string): string;
  explain(value: unknown): DigestComputation;
};

function defaultCanonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => defaultCanonicalize(entry));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, defaultCanonicalize(entry)]),
    );
  }

  return value;
}

export function createDigestEngine(input: {
  readonly algorithm?: DigestHashAlgorithm;
  readonly canonicalize?: DigestCanonicalizer;
} = {}): DigestEngineContract {
  const algorithm = input.algorithm ?? "sha256";
  const canonicalize = input.canonicalize ?? defaultCanonicalize;

  const serialize = (value: unknown): string => JSON.stringify(canonicalize(value));
  const digestText = (value: string): string => createHash(algorithm).update(value).digest("hex");
  const digest = (value: unknown): string => digestText(serialize(value));

  return {
    algorithm,
    canonicalize,
    serialize,
    digest,
    digestText,
    explain(value) {
      const canonicalValue = canonicalize(value);
      const canonicalJson = JSON.stringify(canonicalValue);
      return {
        algorithm,
        canonical_value: canonicalValue,
        canonical_json: canonicalJson,
        digest: digestText(canonicalJson),
      };
    },
  };
}

export const DigestEngine = createDigestEngine();
