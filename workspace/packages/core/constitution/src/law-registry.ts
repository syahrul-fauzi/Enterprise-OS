import type { ConstitutionLaw } from "./laws";

export type ConstitutionLawProfile = "baseline" | "strict" | "enterprise";

export type ConstitutionLawRegistry<TInput> = {
  readonly all: readonly ConstitutionLaw<TInput>[];
  enabled(profile?: ConstitutionLawProfile): readonly ConstitutionLaw<TInput>[];
};

export function defineConstitutionLawRegistry<TInput>(input: {
  readonly laws: readonly ConstitutionLaw<TInput>[];
  readonly profiles: Readonly<Record<ConstitutionLawProfile, readonly string[]>>;
}): ConstitutionLawRegistry<TInput> {
  const lawIndex = new Map(input.laws.map((law) => [law.law_id, law]));

  return {
    all: input.laws,
    enabled(profile = "enterprise") {
      const selectedLawIds = input.profiles[profile];
      return selectedLawIds
        .map((lawId) => lawIndex.get(lawId))
        .filter((law): law is ConstitutionLaw<TInput> => law !== undefined);
    },
  };
}
