const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const clientConfig = {
  /** How long a live request waits for a pharmacy before the client is asked what to do. */
  queueWindowMs: 30 * MINUTE,
  /** How long the client has to pay once a pharmacy has confirmed. */
  checkoutWindowMs: HOUR,
  /** Unverified drafts are discarded after this long. */
  verificationTtlMs: 10 * MINUTE,
} as const;
