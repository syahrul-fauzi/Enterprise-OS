/**
 * @repo/presentation-shared
 * Shared utilities and helpers for all EOS presentation layers
 * Reusable cross-domain logic for all products and surfaces
 */

// Export surface detection utilities for FACE-001/FACE-002-RUNTIME compliance
export { detectCurrentSurface, isSurfaceSupported } from './surface-utils';

// Export existing shared components
export { StatusPoller } from '../StatusPoller';