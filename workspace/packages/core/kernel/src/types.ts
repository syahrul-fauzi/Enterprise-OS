export interface CapabilityContracts {
  readonly entities?: readonly unknown[];
  readonly valueObjects?: readonly unknown[];
  readonly domainEvents?: readonly unknown[];
  readonly dtos?: readonly unknown[];
}

export interface CapabilityCommand<TInput = unknown, TOutput = unknown> {
  readonly kind: "command";
  readonly name: string;
  readonly version?: string;
  readonly input?: TInput;
  readonly output?: TOutput;
  execute(input: TInput): Promise<TOutput> | TOutput;
}

export interface CapabilityQuery<TInput = unknown, TOutput = unknown> {
  readonly kind: "query";
  readonly name: string;
  readonly version?: string;
  readonly input?: TInput;
  readonly output?: TOutput;
  execute(input: TInput): Promise<TOutput> | TOutput;
}

export interface CapabilityRepository<TEntity = unknown, TId = string> {
  readonly kind: "repository";
  readonly entityName: string;
  byId(id: TId): Promise<TEntity | undefined> | TEntity | undefined;
  list(): Promise<readonly TEntity[]> | readonly TEntity[];
  save(entity: TEntity): Promise<TEntity> | TEntity;
  remove(id: TId): Promise<boolean> | boolean;
}

export interface CapabilityImplementation {
  readonly commands?: Readonly<Record<string, CapabilityCommand>>;
  readonly queries?: Readonly<Record<string, CapabilityQuery>>;
  readonly repositories?: Readonly<Record<string, CapabilityRepository>>;
  readonly services?: Readonly<Record<string, unknown>>;
  readonly entry?: unknown;
}

export interface CapabilityDescriptor {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly contracts?: CapabilityContracts;
  readonly presentation?: unknown;
  /**
   * @deprecated Renamed to `presentation`. Field ini disimpan untuk backward
   * compatibility dengan manifest lama. Konsumen baru wajib menggunakan field
   * `presentation`. Tipe sengaja dibuat `unknown` agar foundation kernel
   * (core layer) tidak bergantung pada vocabulary consumer-surface.
   */
  readonly experience?: unknown;
  readonly implementation: CapabilityImplementation;
}

export interface WorkspaceAggregateBinding {
  readonly id: string;
  readonly capabilities: readonly string[];
}


