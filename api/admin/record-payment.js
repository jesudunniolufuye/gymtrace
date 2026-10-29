// POST /api/admin/record-payment (admin only): record a cash or bank
// transfer payment taken at the front desk. Creates the payment record and
// the subscription exactly like an online payment, with a receipt.
//
// Body: { memberId, plan: 'monthly' | 'session', method: 'cash' | 'transfer',
//         amount: whole naira, externalReference?, note?, idempotencyKey }
//   externalReference: bank transfer reference (required for transfers) or
//                      the paper receipt-book number for cash (optional)
//   note:              required when the amount differs from the plan price
import { adminDb } from '../_lib/firebaseAdmin.js';
import { HttpError, apiHandler, readJson, requireUser, send } from '../_lib/http.js';
import { IDEMPOTENCY_KEY, checkEligibility, commitPayment, paymentRefFor, serializePayment } from '../_lib/payments.js';
import { findPlan } from '../../shared/subscription.js';

const METHODS = ['cash', 'transfer'];
const MAX_AMOUNT = 10_000_000;
const UID_PATTERN = /^[A-Za-z0-9]{10,128}$/;

const invalid = (field, message) => new HttpError(400, message, { field });
const naira = (n) => `₦${n.toLocaleString('en-NG')}`;

export default apiHandler('/admin/record-payment', ['POST'], async (req, res) => {
  const { uid: staffId, profile: staff } = await requireUser(req, { roles: ['admin'] });
  const body = await readJson(req);

  // --- validate the form ---
  const plan = findPlan(body.plan);
  if (!plan) throw invalid('plan', 'Choose a valid plan.');
  if (!METHODS.includes(body.method)) throw invalid('method', 'Choose cash or bank transfer.');

  const amount = body.amount;
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    throw invalid('amount', 'Enter the amount received in whole naira.');
  }

  const externalReference = String(body.externalReference ?? '').trim();
  if (externalReference.length > 60) throw invalid('externalReference', 'Reference is too long (max 60 characters).');
  if (body.method === 'transfer' && externalReference.length < 3) {
    throw invalid('externalReference', 'Enter the bank transfer reference.');
  }

  const note = String(body.note ?? '').trim();
  if (note.length > 200) throw invalid('note', 'Note is too long (max 200 characters).');
  if (amount !== plan.amount && note.length < 3) {
    throw invalid('note', `The amount differs from the plan price (${naira(plan.amount)}). Add a note explaining why.`);
  }

  if (!IDEMPOTENCY_KEY.test(String(body.idempotencyKey ?? ''))) {
    throw new HttpError(400, 'Missing or invalid idempotency key.');
  }

  // --- check the member ---
  const memberId = String(body.memberId ?? '');
  if (!UID_PATTERN.test(memberId)) throw new HttpError(404, 'Member Not Found', { code: 'member-not-found' });
  const memberSnap = await adminDb.doc(`users/${memberId}`).get();
  if (!memberSnap.exists) throw new HttpError(404, 'Member Not Found', { code: 'member-not-found' });
  const member = memberSnap.data();
  if (member.role !== 'member') {
    throw new HttpError(400, `This is a ${member.role} account, not a gym member.`, { code: 'not-a-member' });
  }
  if (member.status === 'disabled') {
    throw new HttpError(403, 'This account is deactivated. Reactivate it before recording a payment.', {
      code: 'account-disabled',
    });
  }

  // A double-click or retry of the same form submission: return the first result.
  const earlier = await paymentRefFor(memberId, body.idempotencyKey).get();
  if (earlier.exists) return send(res, 200, { payment: serializePayment(earlier.id, earlier.data()) });

  checkEligibility(member.subscription, plan.id, Date.now());

  const { id, data } = await commitPayment({
    memberId,
    member,
    plan,
    amount,
    idempotencyKey: body.idempotencyKey,
    fields: {
      method: body.method,
      externalReference: externalReference || null,
      note: note || null,
      recordedBy: { uid: staffId, name: staff.name ?? '' },
    },
    outcome: { status: 'success' },
  });
  send(res, 200, { payment: serializePayment(id, data) });
});
