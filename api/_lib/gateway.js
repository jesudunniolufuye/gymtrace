// SIMULATED payment gateway. Decides the outcome of a "charge" from the card
// number, like a payment provider's test mode. No money moves and no card
// data leaves this function apart from brand and last 4 digits.
import { TEST_CARDS, digitsOnly } from '../../shared/card.js';

const DEFAULT_DELAY_MS = 1200;

export async function simulateNetworkDelay() {
  const ms = Number(process.env.PAY_SIM_DELAY_MS ?? DEFAULT_DELAY_MS);
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns { status: 'success' } or { status: 'failed', failureReason }. */
export function chargeCard(cardNumber) {
  const digits = digitsOnly(cardNumber);
  if (digits === TEST_CARDS.declined) {
    return { status: 'failed', failureReason: 'Card declined by the issuing bank.' };
  }
  if (digits === TEST_CARDS.insufficientFunds) {
    return { status: 'failed', failureReason: 'Insufficient funds.' };
  }
  return { status: 'success' };
}
