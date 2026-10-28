// Server-side settings read from environment variables (set per Vercel
// environment). Read at call time so tests can switch them.

/**
 * The simulated card gateway is OFF unless explicitly enabled. Production
 * must leave PAYMENTS_SIMULATOR unset; staging/demo sets it to "enabled".
 * A missing or misspelt value therefore fails safe (no free memberships).
 */
export const cardSimulatorEnabled = () => process.env.PAYMENTS_SIMULATOR === 'enabled';
