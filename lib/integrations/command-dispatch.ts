export const COMMAND_DISPATCH_RETRY_AFTER_MS = 15 * 60 * 1000;

export function isCommandDispatchStale(dispatchedAt?: string | null, nowMs = Date.now()) {
  if (!dispatchedAt) return false;
  const dispatchedMs = new Date(dispatchedAt).getTime();
  return Number.isFinite(dispatchedMs) && dispatchedMs < nowMs - COMMAND_DISPATCH_RETRY_AFTER_MS;
}
