export function buildStateKey(path: string, lineStart: number): string {
  return `${path}::${lineStart}`;
}

export function computeBlockedUntil(failureCount: number, now: number): number {
  if (failureCount < 5) {
    return 0;
  }

  const level = Math.floor((failureCount - 5) / 3) + 1;
  const seconds = level * level;
  return now + seconds * 1000;
}
