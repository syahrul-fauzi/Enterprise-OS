export type ArtifactReader<TContext, TSnapshot> = Readonly<{
  id: string;
  read(context: TContext): TSnapshot;
}>;

export function executeArtifactReaderRegistry<
  TContext,
  TReaders extends Record<string, ArtifactReader<TContext, unknown>>,
>(input: {
  readonly context: TContext;
  readonly readers: TReaders;
}): {
  readonly [K in keyof TReaders]: TReaders[K] extends ArtifactReader<
    TContext,
    infer TSnapshot
  >
    ? TSnapshot
    : never;
} {
  return Object.fromEntries(
    Object.entries(input.readers).map(([key, reader]) => [
      key,
      reader.read(input.context),
    ]),
  ) as {
    readonly [K in keyof TReaders]: TReaders[K] extends ArtifactReader<
      TContext,
      infer TSnapshot
    >
      ? TSnapshot
      : never;
  };
}
