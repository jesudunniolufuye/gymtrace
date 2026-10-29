// Writing payments and the subscriptions they buy. Shared by online card
// payments (api/pay.js) and payments taken at the front desk
// (api/admin/record-payment.js), so both follow exactly the same rules.
import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.js';
import { HttpError } from './http.js';
import { PurchaseError, applyPurchase, toMillis } from '../../shared/subscription.js';

export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;

/** Receipt number shown to people, e.g. GT-20261029-4F1A2B. */
export function newReference(nowMs) {
  const day = new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, '');
  return `GT-${day}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Payment ids are scoped to the member so idempotency keys can't collide. */
export const paymentRefFor = (memberId, idempotencyKey) => adminDb.doc(`payments/${memberId}_${idempotencyKey}`);

/** Throws 409 when buying `planId` now makes no sense (e.g. day pass during monthly). */
export function checkEligibility(subscription, planId, nowMs) {
  try {
    return applyPurchase(subscription, planId, nowMs);
  } catch (error) {
    if (error instanceof PurchaseError) throw new HttpError(409, error.message, { code: error.code });
    throw error;
  }
}

/**
 * Records one payment attempt and, when it succeeded, the subscription it
 * buys, in a single transaction. If this idempotency key was already used,
 * returns the earlier payment and changes nothing.
 *
 * fields:  method-specific details (method, card brand/last 4, transfer
 *          reference, recordedBy, note, ...)
 * outcome: { status: 'success' } or { status: 'failed', failureReason }
 * Returns { id, data }.
 */
export async function commitPayment({ memberId, member, plan, amount, idempotencyKey, fields, outcome }) {
  const paymentRef = paymentRefFor(memberId, idempotencyKey);
  const userRef = adminDb.doc(`users/${memberId}`);

  return adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(paymentRef);
    if (existing.exists) return { id: paymentRef.id, data: existing.data() };

    const userSnap = await tx.get(userRef);
    const nowMs = Date.now();
    const base = {
      memberId,
      memberName: member.name ?? '',
      memberEmail: member.email ?? '',
      plan: plan.id,
      planLabel: plan.label,
      amount,
      listPrice: plan.amount,
      currency: plan.currency,
      reference: newReference(nowMs),
      idempotencyKey,
      createdAt: FieldValue.serverTimestamp(),
      ...fields,
    };

    if (outcome.status !== 'success') {
      const failed = { ...base, status: 'failed', failureReason: outcome.failureReason };
      tx.create(paymentRef, failed);
      return { id: paymentRef.id, data: failed };
    }

    // Re-check inside the transaction in case the subscription just changed.
    const purchase = checkEligibility(userSnap.get('subscription'), plan.id, nowMs);
    const paid = {
      ...base,
      status: 'success',
      periodStart: Timestamp.fromMillis(purchase.periodStart),
      periodEnd: Timestamp.fromMillis(purchase.periodEnd),
    };
    tx.create(paymentRef, paid);
    tx.update(userRef, {
      subscription: {
        plan: purchase.subscription.plan,
        expiresAt: Timestamp.fromMillis(purchase.subscription.expiresAt),
        sessionCredits: purchase.subscription.sessionCredits,
        lastPaymentId: paymentRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
    });
    return { id: paymentRef.id, data: paid };
  });
}

/** Firestore → JSON-friendly payment for API responses. */
export function serializePayment(id, data) {
  return {
    id,
    reference: data.reference,
    plan: data.plan,
    planLabel: data.planLabel,
    amount: data.amount,
    listPrice: data.listPrice ?? data.amount,
    currency: data.currency,
    status: data.status,
    method: data.method ?? 'card',
    failureReason: data.failureReason ?? null,
    cardBrand: data.cardBrand ?? null,
    cardLast4: data.cardLast4 ?? null,
    externalReference: data.externalReference ?? null,
    note: data.note ?? null,
    recordedBy: data.recordedBy ?? null,
    periodStart: toMillis(data.periodStart),
    periodEnd: toMillis(data.periodEnd),
  };
}
