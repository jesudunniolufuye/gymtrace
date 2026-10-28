// POST /api/pay — simulated payment for a membership plan (FR5, FR6, FR7).
//
// Body: { plan: 'monthly' | 'session', idempotencyKey: string,
//         card: { name, number, expiry: 'MM/YY', cvc } }
//
// The server decides the price, checks the member is allowed to buy the plan,
// "charges" the card through the simulated gateway, then records the payment
// and updates the member's subscription in one transaction. Retrying with the
// same idempotencyKey returns the original result instead of charging twice.
import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './_lib/firebaseAdmin.js';
import { HttpError, apiHandler, readJson, requireUser, send } from './_lib/http.js';
import { chargeCard, simulateNetworkDelay } from './_lib/gateway.js';
import { validateCard } from '../shared/card.js';
import { PLANS, PurchaseError, applyPurchase, toMillis } from '../shared/subscription.js';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;

function newReference(nowMs) {
  const day = new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, '');
  return `GT-${day}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Firestore → JSON-friendly payment for the response. */
function serializePayment(id, data) {
  return {
    id,
    reference: data.reference,
    plan: data.plan,
    planLabel: data.planLabel,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    failureReason: data.failureReason ?? null,
    cardBrand: data.cardBrand,
    cardLast4: data.cardLast4,
    periodEnd: toMillis(data.periodEnd),
  };
}

function checkEligibility(subscription, planId, nowMs) {
  try {
    return applyPurchase(subscription, planId, nowMs);
  } catch (error) {
    if (error instanceof PurchaseError) throw new HttpError(409, error.message, { code: error.code });
    throw error;
  }
}

export default apiHandler('/pay', ['POST'], async (req, res) => {
  const { uid, profile } = await requireUser(req, { roles: ['member'] });
  const body = await readJson(req);

  const plan = PLANS[body.plan];
  if (!plan) throw new HttpError(400, 'Choose a valid plan.');
  if (!IDEMPOTENCY_KEY.test(String(body.idempotencyKey ?? ''))) {
    throw new HttpError(400, 'Missing or invalid idempotency key.');
  }

  const card = validateCard(body.card);
  if (!card.ok) throw new HttpError(400, card.message, { field: card.field });

  // Payment ids are scoped to the member so keys can't collide across users.
  const paymentRef = adminDb.doc(`payments/${uid}_${body.idempotencyKey}`);
  const userRef = adminDb.doc(`users/${uid}`);

  // A retry of a request we already processed: return the stored result.
  const earlier = await paymentRef.get();
  if (earlier.exists) return respond(res, earlier.id, earlier.data());

  // Refuse pointless purchases before "charging" anything.
  checkEligibility(profile.subscription, plan.id, Date.now());

  await simulateNetworkDelay();
  const charge = chargeCard(body.card.number);

  const stored = await adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(paymentRef);
    if (existing.exists) return existing.data();

    const userSnap = await tx.get(userRef);
    const nowMs = Date.now();
    const base = {
      memberId: uid,
      memberName: profile.name ?? '',
      memberEmail: profile.email ?? '',
      plan: plan.id,
      planLabel: plan.label,
      amount: plan.amount,
      currency: plan.currency,
      cardBrand: card.brand,
      cardLast4: card.last4,
      reference: newReference(nowMs),
      idempotencyKey: body.idempotencyKey,
      gateway: 'simulated',
      createdAt: FieldValue.serverTimestamp(),
    };

    if (charge.status !== 'success') {
      const failed = { ...base, status: 'failed', failureReason: charge.failureReason };
      tx.create(paymentRef, failed);
      return failed;
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
    return paid;
  });

  return respond(res, paymentRef.id, stored);
});

function respond(res, id, data) {
  const payment = serializePayment(id, data);
  if (data.status === 'success') return send(res, 200, { payment });
  return send(res, 402, { error: data.failureReason || 'Payment failed.', payment });
}
