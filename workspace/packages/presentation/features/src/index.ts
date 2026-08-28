export { ProductCreateForm } from "./product-creation/ProductCreateForm.js";
export type { ProductCreateFormProps } from "./product-creation/ProductCreateForm.js";

// Authentication pages - reusable across all products
export { LoginPage } from "./auth/LoginPage.js";
export { SignupPage } from "./auth/SignupPage.js";

// Core Work state derivation utilities - reusable across all products
export { deriveWorkRealityModel } from "./work/derive-work-state";
export type {
  GenericWorkAggregate,
  GenericCommunicationEvent,
  GenericEvidenceItem,
  GenericExternalVerification,
  GenericOutcome,
  AnyWorkAggregate,
} from "./work/derive-work-state";

// Work Actions Features - EOS FACE Work Reality capabilities
export { executeTransition } from "./work/work-actions.js";
export type { WorkTransitionCommand, WorkTransitionRequest, WorkTransitionResult } from "./work/work-actions.js";

// Communication Features - EOS FACE Work Reality messaging
export { sendCommunication } from "./work/communication.js";
export type { SendCommunicationRequest, SendCommunicationResult } from "./work/communication.js";

// Evidence Features - EOS FACE Work Reality artifact management
export { uploadEvidence } from "./work/evidence.js";
export type { UploadEvidenceRequest, UploadEvidenceResult } from "./work/evidence.js";

// Intent Formation Features - EOS FACE Formation lifecycle building blocks
// Implements EOS-FACE-FORMATION-001: Intent/Need → Work Formation protocol boundary
export { IntentNeedInput } from "./intent/IntentNeedInput.js";
export { IntentUnderstandingPreview } from "./intent/IntentUnderstandingPreview.js";
export { IntentRefinementPage } from "./intent/IntentRefinementPage.js";
export { WorkProposal } from "./work/WorkProposal.js";
export { WorkFormationButton } from "./work/WorkFormationButton.js";
export type {
  IntentActorType,
  IntentSource,
  IntentContext,
  IntentResolution,
  IntentContract,
  FormationConfirmation,
  IntentRefinementPageProps,
  WorkFormationButtonProps
} from "./intent/types.js";