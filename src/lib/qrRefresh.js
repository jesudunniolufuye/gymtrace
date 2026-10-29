// Decisions for the member QR page's refresh loop, kept apart from React so
// they can be tested.

// Ask for the next code a few seconds before the current one expires, so the
// member never shows a code that dies while the staff member is scanning.
export const REFRESH_BEFORE_MS = 5000;
// After a failed attempt, wait this long before trying again.
export const RETRY_AFTER_MS = 3000;

/** Whether the one-second tick should start fetching a new code now. */
export function shouldRefresh({ expiresAt, now, fetching, lastAttemptAt }) {
  if (!expiresAt || fetching) return false;
  if (expiresAt - now > REFRESH_BEFORE_MS) return false;
  return now - (lastAttemptAt ?? 0) >= RETRY_AFTER_MS;
}

/**
 * What to do when fetching a code fails:
 *  'no-access' the server said no (403): drop the code and say why
 *  'keep'      the code on screen is still valid: keep showing it, retry later
 *  'error'     nothing valid to show: show the error and Try Again
 */
export function afterRefreshFailure({ qr, now, status }) {
  if (status === 403) return 'no-access';
  if (qr && qr.expiresAt > now) return 'keep';
  return 'error';
}
