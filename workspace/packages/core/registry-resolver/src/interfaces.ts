import type {
  ResolverResolutionBundle,
  ResolverProofSpec,
  ResolverDagSpec,
  ResolverStrategySpec,
  ResolverContractRef,
  CompatibilityMatrix,
  RetryConfig,
  BlockedStatus,
  FailureStrategy,
  RollbackStrategy,
} from "./types";
import type { TransformationId } from "@repo/core-transformation-registry";

export const TRANSFORMATION_ID_VALIDATION_RULE =
  "TransformationId literal must match catalog transformations exactly";

export interface RegistryResolverInterface {
  resolve(id: TransformationId): ResolverResolutionBundle;
  resolveAll(): readonly ResolverResolutionBundle[];
  resolveRootOfTrust(): ResolverResolutionBundle;
  isBlocked(id: TransformationId): BlockedStatus;
}

export const RESOLVER_INTERFACE_NAME = "RegistryResolverInterface";

export type ResolverFunction = (
  id: TransformationId,
) => ResolverResolutionBundle;
export type ResolverAllFunction = () => readonly ResolverResolutionBundle[];
export type ResolverRootFunction = () => ResolverResolutionBundle;
export type IsBlockedFunction = (id: TransformationId) => BlockedStatus;

export type {
  ResolverResolutionBundle,
  ResolverProofSpec,
  ResolverDagSpec,
  ResolverStrategySpec,
  ResolverContractRef,
  CompatibilityMatrix,
  RetryConfig,
  BlockedStatus,
  FailureStrategy,
  RollbackStrategy,
};
