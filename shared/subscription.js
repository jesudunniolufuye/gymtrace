// Membership plans and subscription rules, shared by the browser (display)
// and the API (authoritative). Pure functions only: no Firebase imports.
//
// A member's subscription lives on users/{uid}.subscription and is written
// only by the server:
//   { plan: 'monthly' | 'session', expiresAt: Timestamp, sessionCredits: number,
//     updatedAt: Timestamp, lastPaymentId: string }

export const DAY_MS = 24 * 60 * 60 * 1000;

// Babcock University is in Nigeria: Africa/Lagos is UTC+1 all year (no DST).
// Servers run in UTC, so "end of today" must be computed in gym time.
export const GYM_UTC_OFFSET_MS = 1 * 60 * 60 * 1000;

export const PLANS = {
  monthly: {
    id: 'monthly',
    label: 'Monthly Membership',
    amount: 25000,
    currency: 'NGN',
    summary: 'Unlimited gym entry for 30 days',
  },
  session: {
    id: 'session',
    label: 'Day Pass',
    amount: 500,
    currency: 'NGN',
    summary: 'One gym entry, valid until midnight on the day you buy it',
  },
};

/** The plan with this id, or null. Own properties only, so 'constructor' etc. are not plans. */
export const findPlan = (id) => (typeof id === 'string' && Object.hasOwn(PLANS, id) ? PLANS[id] : null);

export const MONTHLY_PERIOD_DAYS = 30;

/** Accepts a Firestore Timestamp (client or admin), Date, millis or {seconds}. */
export function toMillis(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  }
  if (typeof value._seconds === 'number') {
    return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
  }
  return null;
}

/** First instant of the next gym day (midnight Lagos time), as UTC millis. */
export function endOfGymDay(nowMs) {
  const localMs = nowMs + GYM_UTC_OFFSET_MS;
  const nextLocalMidnight = Math.floor(localMs / DAY_MS) * DAY_MS + DAY_MS;
  return nextLocalMidnight - GYM_UTC_OFFSET_MS;
}

/** First instant of the current gym day (midnight Lagos time), as UTC millis. */
export function startOfGymDay(nowMs) {
  return endOfGymDay(nowMs) - DAY_MS;
}

/** First instant of the current calendar month in Lagos time, as UTC millis. */
export function startOfGymMonth(nowMs) {
  const local = new Date(nowMs + GYM_UTC_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - GYM_UTC_OFFSET_MS;
}

/**
 * What a subscription means right now.
 * Returns { active, plan, expiresAt, credits, label, reason }.
 * reason is one of: 'none' | 'expired' | 'used' | null (when active).
 */
export function getSubscriptionStatus(subscription, nowMs = Date.now()) {
  const plan = subscription?.plan;
  const expiresAt = toMillis(subscription?.expiresAt);
  const credits = Number(subscription?.sessionCredits || 0);

  if (!plan || !findPlan(plan) || !expiresAt) {
    return { active: false, plan: null, expiresAt: null, credits: 0, label: 'No active plan', reason: 'none' };
  }

  const notExpired = expiresAt > nowMs;

  if (plan === 'monthly') {
    return {
      active: notExpired,
      plan,
      expiresAt,
      credits: 0,
      label: PLANS.monthly.label,
      reason: notExpired ? null : 'expired',
    };
  }

  // Day pass: needs both time left today and an unused entry.
  const active = notExpired && credits > 0;
  return {
    active,
    plan,
    expiresAt,
    credits: notExpired ? credits : 0,
    label: PLANS.session.label,
    reason: active ? null : notExpired ? 'used' : 'expired',
  };
}

export class PurchaseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * The subscription a member ends up with after buying `planId` at `nowMs`.
 * Returns { subscription: { plan, expiresAt, sessionCredits }, periodStart, periodEnd }
 * with times as millis. Throws PurchaseError when the purchase makes no sense.
 */
export function applyPurchase(currentSubscription, planId, nowMs) {
  if (!findPlan(planId)) throw new PurchaseError('invalid-plan', 'Unknown plan.');
  const current = getSubscriptionStatus(currentSubscription, nowMs);

  if (planId === 'monthly') {
    // Renewing early extends from the current expiry, so no days are lost.
    const periodStart = current.active && current.plan === 'monthly' ? current.expiresAt : nowMs;
    const periodEnd = periodStart + MONTHLY_PERIOD_DAYS * DAY_MS;
    return {
      subscription: { plan: 'monthly', expiresAt: periodEnd, sessionCredits: 0 },
      periodStart,
      periodEnd,
    };
  }

  // Day pass.
  if (current.active && current.plan === 'monthly') {
    throw new PurchaseError(
      'monthly-active',
      'You already have an active monthly membership, so a day pass is not needed.',
    );
  }
  // Unused entries bought earlier today carry over; yesterday's are gone.
  const carried = current.plan === 'session' && current.reason !== 'expired' ? current.credits : 0;
  const periodEnd = endOfGymDay(nowMs);
  return {
    subscription: { plan: 'session', expiresAt: periodEnd, sessionCredits: carried + 1 },
    periodStart: nowMs,
    periodEnd,
  };
}
