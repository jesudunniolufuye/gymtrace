// POST /api/pay — simulated online card payment for a membership plan
// (FR5, FR6, FR7). Only available when PAYMENTS_SIMULATOR=enabled
// (staging/demo); production members pay at the front desk instead.
//
// Body: { plan: 'monthly' | 'session', idempotencyKey: string,
//         card: { name, number, expiry: 'MM/YY', cvc } }
//
// The server decides the price, checks the member is allowed to buy the plan,
// "charges" the card through the simulated gateway, then records the payment
// and updates the member's subscription in one transaction. Retrying with the
// same idempotencyKey returns the original result instead of charging twice.
import { HttpError, apiHandler, readJson, requireUser, send } from './_lib/http.js';
import { chargeCard, simulateNetworkDelay } from './_lib/gateway.js';
import { cardSimulatorEnabled } from './_lib/config.js';
import { IDEMPOTENCY_KEY, checkEligibility, commitPayment, paymentRefFor, serializePayment } from './_lib/payments.js';
import { validateCard } from '../shared/card.js';
import { PLANS } from '../shared/subscription.js';

export default apiHandler('/pay', ['POST'], async (req, res) => {
  if (!cardSimulatorEnabled()) {
    throw new HttpError(403, 'Online card payments are not available. Please pay at the front desk.', {
      code: 'simulator-disabled',
    });
  }
  const { uid, profile } = await requireUser(req, { roles: ['member'] });
  const body = await readJson(req);

  const plan = PLANS[body.plan];
  if (!plan) throw new HttpError(400, 'Choose a valid plan.');
  if (!IDEMPOTENCY_KEY.test(String(body.idempotencyKey ?? ''))) {
    throw new HttpError(400, 'Missing or invalid idempotency key.');
  }

  const card = validateCard(body.card);
  if (!card.ok) throw new HttpError(400, card.message, { field: card.field });

  // A retry of a request we already processed: return the stored result.
  const earlier = await paymentRefFor(uid, body.idempotencyKey).get();
  if (earlier.exists) return respond(res, earlier.id, earlier.data());

  // Refuse pointless purchases before "charging" anything.
  checkEligibility(profile.subscription, plan.id, Date.now());

  await simulateNetworkDelay();
  const charge = chargeCard(body.card.number);

  const { id, data } = await commitPayment({
    memberId: uid,
    member: profile,
    plan,
    amount: plan.amount,
    idempotencyKey: body.idempotencyKey,
    fields: { method: 'card', gateway: 'simulated', cardBrand: card.brand, cardLast4: card.last4 },
    outcome: charge,
  });
  return respond(res, id, data);
});

function respond(res, id, data) {
  const payment = serializePayment(id, data);
  if (data.status === 'success') return send(res, 200, { payment });
  return send(res, 402, { error: data.failureReason || 'Payment failed.', payment });
}
