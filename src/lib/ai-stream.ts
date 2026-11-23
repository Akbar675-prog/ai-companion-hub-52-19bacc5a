const MAX_BOUNDARY_OVERLAP = 2_048;

/** Merge a resumed model stream without appending text it replayed from the prior attempt. */
export function mergeStreamContinuation(previous: string, incoming: string): string {
  if (!incoming) return previous;
  if (!previous) return incoming;
  if (incoming.startsWith(previous)) return incoming;
  if (previous.startsWith(incoming)) return previous;

  const trimmedIncoming = incoming.trimStart();
  if (trimmedIncoming.startsWith(previous)) {
    return previous + trimmedIncoming.slice(previous.length);
  }
  const replayIndex = incoming.indexOf(previous);
  if (replayIndex >= 0 && replayIndex <= 128) {
    return previous + incoming.slice(replayIndex + previous.length);
  }

  const maxOverlap = Math.min(previous.length, incoming.length, MAX_BOUNDARY_OVERLAP);
  for (let size = maxOverlap; size > 0; size--) {
    if (previous.endsWith(incoming.slice(0, size))) {
      return previous + incoming.slice(size);
    }
  }

  return previous + incoming;
}