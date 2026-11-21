export interface TimeProvider {
  now(): Date;
}

let timeProvider: TimeProvider = {
  now: () => new Date(),
};

export function registerTimeProvider(provider: TimeProvider): void {
  timeProvider = provider;
}

export function getNow(): Date {
  return timeProvider.now();
}

export const DefaultTimeProvider: TimeProvider = {
  now: () => new Date(),
};