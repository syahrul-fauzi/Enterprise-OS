import type {
  TransformationDeclaration,
  TransformationRegistryDocument,
} from "./interfaces.js";

import { TRANSFORMATION_T001 } from "./registry/transformations/t001.js";
import { TRANSFORMATION_T002 } from "./registry/transformations/t002.js";
import { TRANSFORMATION_T003 } from "./registry/transformations/t003.js";
import { TRANSFORMATION_T004 } from "./registry/transformations/t004.js";
import { TRANSFORMATION_T005 } from "./registry/transformations/t005.js";

export * from "./types.js";
export type * from "./interfaces.js";
export * from "./schema.js";
export type {
  TransformationDeclaration,
  TransformationRegistryDocument,
} from "./interfaces.js";

export {
  TRANSFORMATION_T001,
  TRANSFORMATION_T002,
  TRANSFORMATION_T003,
  TRANSFORMATION_T004,
  TRANSFORMATION_T005,
};

export const TRANSFORMATION_REGISTRY_ID = "TRANSFORMATION-REGISTRY-V1";
export const TRANSFORMATION_REGISTRY_VERSION = "1.0.0";
export const TRANSFORMATION_REGISTRY_STATUS = "VERIFIED";
export const CATALOG_CANONICAL_REF =
  "/root/Enterprise OS/enterprise/execution/transformation-catalog.yaml";

export const TRANSFORMATIONS: readonly TransformationDeclaration[] = [
  TRANSFORMATION_T001,
  TRANSFORMATION_T002,
  TRANSFORMATION_T003,
  TRANSFORMATION_T004,
  TRANSFORMATION_T005,
] as const;

export const TRANSFORMATION_COUNT_SPRINT0_REQUIRED = 5;

export const TRANSFORMATION_REGISTRY_DOCUMENT: TransformationRegistryDocument = {
  registry_id: TRANSFORMATION_REGISTRY_ID,
  version: TRANSFORMATION_REGISTRY_VERSION,
  status: TRANSFORMATION_REGISTRY_STATUS,
  catalog_canonical_ref: CATALOG_CANONICAL_REF,
  transformations: TRANSFORMATIONS,
  count: TRANSFORMATIONS.length,
  root_of_trust_transformation: "T001",
};

export const getTransformationById = (
  id: string,
): TransformationDeclaration | undefined =>
  TRANSFORMATIONS.find((t) => t.transformation_id === id);

export const getRootOfTrustTransformation = (): TransformationDeclaration =>
  TRANSFORMATION_T001;
