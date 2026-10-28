// Card checks for the SIMULATED payment gateway. No real card is ever
// charged; only the brand and last 4 digits are stored.

// Test cards shown on the checkout form. Any other Luhn-valid number succeeds.
export const TEST_CARDS = {
  success: '4084084084084081',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
};

export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

/** Standard Luhn checksum used by all card networks. */
export function luhnValid(number) {
  const digits = digitsOnly(number);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardBrand(number) {
  const d = digitsOnly(number);
  if (/^(506[01]|507[89]|6500)/.test(d)) return 'Verve';
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  return 'Card';
}

/** "MM/YY" → true if the card is still valid this month. */
export function expiryValid(expiry, now = new Date()) {
  const m = /^\s*(\d{2})\s*\/\s*(\d{2})\s*$/.exec(String(expiry ?? ''));
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  // Cards are valid until the end of their expiry month.
  const endOfExpiryMonth = Date.UTC(year, month, 1);
  return endOfExpiryMonth > now.getTime();
}

export const cvcValid = (cvc) => /^\d{3,4}$/.test(String(cvc ?? ''));

/**
 * Validates the whole card. Returns { ok: true, last4, brand } or
 * { ok: false, field, message } for the first problem found.
 */
export function validateCard(card, now = new Date()) {
  const name = String(card?.name ?? '').trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, field: 'name', message: 'Enter the name on the card.' };
  }
  if (!luhnValid(card?.number)) {
    return { ok: false, field: 'number', message: 'Card number is not valid.' };
  }
  if (!expiryValid(card?.expiry, now)) {
    return { ok: false, field: 'expiry', message: 'Expiry date is invalid or in the past (MM/YY).' };
  }
  if (!cvcValid(card?.cvc)) {
    return { ok: false, field: 'cvc', message: 'CVC must be 3 or 4 digits.' };
  }
  const digits = digitsOnly(card.number);
  return { ok: true, last4: digits.slice(-4), brand: cardBrand(digits) };
}
