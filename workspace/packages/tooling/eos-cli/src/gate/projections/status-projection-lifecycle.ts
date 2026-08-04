export function materializeAndPersistStatusProjection<
  TProjection extends Record<string, unknown>,
>(input: {
  readonly buildProjection: () => TProjection;
  readonly persistProjection: (projection: TProjection) => TProjection;
}): TProjection {
  return input.persistProjection(input.buildProjection());
}

export function regenerateStatusProjection<
  TProjection extends Record<string, unknown>,
>(input: {
  readonly statusProjectionPath: string;
  readonly buildProjection: () => TProjection;
  readonly persistProjection: (projection: TProjection) => TProjection;
  readonly readPreviousProjection: () => TProjection | null;
  readonly hashProjection: (projection: TProjection) => string;
}): {
  readonly exitCode: number;
  readonly output: string;
  readonly projection: TProjection;
} {
  const previousProjection = input.readPreviousProjection();
  const previousProjectionHash = previousProjection
    ? input.hashProjection(previousProjection)
    : null;
  const firstProjection = input.buildProjection();
  const secondProjection = input.buildProjection();
  const firstProjectionHash = input.hashProjection(firstProjection);
  const secondProjectionHash = input.hashProjection(secondProjection);
  const deterministicRebuild = firstProjectionHash === secondProjectionHash;

  const projection = input.persistProjection(firstProjection);

  return {
    exitCode: deterministicRebuild ? 0 : 1,
    projection,
    output:
      [
        `status_projection_path=${input.statusProjectionPath}`,
        `projection_basis_hash=${String(projection.projection_basis_hash ?? "null")}`,
        `previous_projection_hash=${previousProjectionHash ?? "null"}`,
        `regenerated_projection_hash=${firstProjectionHash}`,
        `independent_regeneration_hash=${secondProjectionHash}`,
        `projection_identical_to_previous=${String(
          previousProjectionHash === null
            ? false
            : previousProjectionHash === firstProjectionHash,
        )}`,
        `governance_determinism=${String(deterministicRebuild)}`,
        `hidden_state_detected=${String(!deterministicRebuild)}`,
      ].join("\n") + "\n",
  };
}
