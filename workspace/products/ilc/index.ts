// ILC product entry point - only export domain-specific runtime
// All core capabilities remain in @repo/core-kernel
export { provideILCContext, type ILCProductContext } from './runtime/product-context-provider';
export { ILC_WORKFLOW, type ILCWorkflowStep, type ILCWorkflowDefinition } from './runtime/workflow-definition';