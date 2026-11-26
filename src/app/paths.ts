/** Route constants for the three sides of FindRx. Import these instead of hard-coding paths. */

export const PHARMACY_HOME = "/pharmacy";

export const paths = {
  /** Public client side: no account, no dashboard shell. */
  client: {
    home: "/",
    forPharmacies: "/for-pharmacies",
    terms: "/terms",
    request: (id: string) => `/request/${id}`,
    pay: (id: string) => `/request/${id}/pay`,
    connected: (id: string) => `/request/${id}/connected`,
  },
  /** Pharmacy sign-in and recovery (shared auth flow). */
  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
    forgotPassword: "/forgot-password",
    verifyOtp: "/verify-otp",
    resetPassword: "/reset-password",
  },
  pharmacy: {
    home: PHARMACY_HOME,
    dashboard: `${PHARMACY_HOME}/dashboard`,
    requests: `${PHARMACY_HOME}/requests`,
    claims: `${PHARMACY_HOME}/claims`,
    claimsTab: (tab: "awaiting" | "paid" | "expired") => `${PHARMACY_HOME}/claims/${tab}`,
    history: `${PHARMACY_HOME}/history`,
    settings: `${PHARMACY_HOME}/settings`,
    settingsPassword: `${PHARMACY_HOME}/settings/password`,
  },
  admin: {
    home: "/admin",
    login: "/admin/login",
    verify: "/admin/verify",
    dashboard: "/admin/dashboard",
    pharmacies: "/admin/pharmacies",
    pharmacy: (id: string) => `/admin/pharmacies/${id}`,
    transactions: "/admin/transactions",
    staff: "/admin/staff",
    settings: "/admin/settings",
    profile: "/admin/profile",
    profilePassword: "/admin/profile/password",
  },
} as const;
