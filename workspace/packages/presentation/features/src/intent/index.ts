// Intent feature barrel export - canonical imports for all intent building blocks
// Aligns with EOS presentation system architecture: Building Block → Composition → Experience → Route
// Part of EOS-FACE-FORMATION-001 vertical slice implementation

export type {
  IntentActorType,
  IntentSource,
  IntentContext,
  IntentResolution,
  IntentContract,
  FormationConfirmation,
  IntentRefinementPageProps
} from './types.js';

export { IntentNeedInput } from './IntentNeedInput.js';
export { IntentUnderstandingPreview } from './IntentUnderstandingPreview.js';
export { IntentRefinementPage } from './IntentRefinementPage.js';