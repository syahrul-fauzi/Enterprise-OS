export interface SessionRevocationPort {
  isRevoked(sessionId: string): Promise<boolean>;
}

let sessionRevocationPort: SessionRevocationPort | null = null;

export function registerSessionRevocationPort(port: SessionRevocationPort): void {
  sessionRevocationPort = port;
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionRevocationPort) {
    console.warn('[SESSION] No SessionRevocationPort registered, defaulting to fail-closed behavior');
    return true;
  }
  return sessionRevocationPort.isRevoked(sessionId);
}