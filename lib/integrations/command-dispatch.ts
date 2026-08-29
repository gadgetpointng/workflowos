export const COMMAND_DISPATCH_RETRY_AFTER_MS = 15 * 60 * 1000;
export const COMMAND_DISPATCH_WARNING_STALE_MS = 60 * 60 * 1000;
export const COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT = 3;

export function isCommandDispatchStale(dispatchedAt?: string | null, nowMs = Date.now()) {
  if (!dispatchedAt) return false;
  const dispatchedMs = new Date(dispatchedAt).getTime();
  return Number.isFinite(dispatchedMs) && dispatchedMs < nowMs - COMMAND_DISPATCH_RETRY_AFTER_MS;
}

export function needsCommandDeliveryAttention(
  attemptCount: number,
  dispatchedAt?: string | null,
  nowMs = Date.now(),
) {
  if (Number.isFinite(attemptCount) && attemptCount >= COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT) return true;
  if (!dispatchedAt) return false;
  const dispatchedMs = new Date(dispatchedAt).getTime();
  return Number.isFinite(dispatchedMs) && dispatchedMs < nowMs - COMMAND_DISPATCH_WARNING_STALE_MS;
}
