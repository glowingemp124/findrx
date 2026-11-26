const SECOND = 1000;

export const pharmacyConfig = {
  /** Claim limits per pharmacy, to discourage claiming without stock. */
  maxClaimsPerHour: 5,
  maxClaimsPerDay: 20,
  /** Mock only: the simulated patient network that keeps the feed busy until real traffic exists. */
  simulation: {
    initialRequests: 4,
    minGapMs: 60 * SECOND,
    maxGapMs: 120 * SECOND,
    /** How long a simulated patient takes to pay after a claim. */
    paymentDelayMs: 25 * SECOND,
    /** Share of simulated patients who pay; the rest let the checkout window lapse. */
    payRate: 0.75,
  },
} as const;
