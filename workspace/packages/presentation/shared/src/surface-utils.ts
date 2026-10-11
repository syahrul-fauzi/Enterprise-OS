/**
 * EOS FACE Surface Detection Utilities
 * Reusable functions to detect current execution surface for Work routing
 * Implements FACE-002-RUNTIME requirement: standardized surface detection across all client components
 */

/**
 * Detects the current runtime surface where the code is executing
 * @returns "web" if running in browser, "api" if running on server/edge, "agent" if in agent runtime
 */
export function detectCurrentSurface(): "web" | "api" | "agent" {
  // Check for browser environment (window exists)
  if (typeof window !== 'undefined') {
    return "web";
  }
  
  // Check for agent runtime specific globals (if present)
  if (typeof process !== 'undefined' && process.env?.EOS_AGENT_RUNTIME === 'true') {
    return "agent";
  }
  
  // Default to server/API runtime
  return "api";
}

/**
 * Verifies if a workflow's presentation boundary supports the current surface
 * @param supportedFaces Array of supported surfaces from workflow presentationBoundary
 * @param currentSurface The current surface to check
 * @returns boolean indicating if the surface is supported
 */
export function isSurfaceSupported(
  supportedFaces: readonly string[] | undefined,
  currentSurface: string
): boolean {
  if (!supportedFaces || supportedFaces.length === 0) {
    return false;
  }
  return Array.prototype.includes.call(supportedFaces, currentSurface);
}