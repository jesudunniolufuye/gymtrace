// POST /api/check-in (admin only): admit a member at the front desk.
//
// Body: { token } scanned from the member's QR code, or
//       { member } typed by staff: the member ID or email (manual check-in).
//
// Everything is checked here on the server (FR10, FR11, FR12):
//   - the QR signature and its 60-second expiry; each code works once
//   - the member exists, is a member, and is not deactivated
//   - the member has an active plan right now; a day pass is used up
// A second scan of the same member within a few minutes is reported as
// "already checked in" instead of using another day-pass entry.
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './_lib/firebaseAdmin.js';
import { HttpError, apiHandler, readJson, requireUser, send } from './_lib/http.js';
import { verifyQrToken } from './_lib/qrToken.js';
import { noAccessMessage } from './_lib/planMessages.js';
import { DAY_MS, getSubscriptionStatus, toMillis } from '../shared/subscription.js';

export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const UID_PATTERN = /^[A-Za-z0-9]{10,128}$/;

const notFound = () => new HttpError(404, 'Member Not Found', { code: 'member-not-found' });

/** Manual entry: member ID or email → member ID. */
async function resolveMember(input) {
  if (input.includes('@')) {
    const snap = await adminDb.collection('users').where('email', '==', input.toLowerCase()).limit(1).get();
    if (snap.empty) throw notFound();
    return snap.docs[0].id;
  }
  if (!UID_PATTERN.test(input)) throw notFound();
  return input;
}

export default apiHandler('/check-in', ['POST'], async (req, res) => {
  const { uid: staffId, profile: staff } = await requireUser(req, { roles: ['admin'] });
  const body = await readJson(req);

  let memberId;
  let qr = null;
  if (typeof body.token === 'string' && body.token.trim()) {
    const verified = verifyQrToken(body.token);
    if (!verified.ok) {
      throw new HttpError(400, 'Invalid or Expired QR Code', { code: 'invalid-qr', reason: verified.reason });
    }
    memberId = verified.uid;
    qr = verified;
  } else if (typeof body.member === 'string' && body.member.trim()) {
    memberId = await resolveMember(body.member.trim());
  } else {
    throw new HttpError(400, 'Scan a QR code or enter a member ID or email.');
  }

  const memberRef = adminDb.doc(`users/${memberId}`);
  const nonceRef = qr ? adminDb.doc(`qrNonces/${qr.nonce}`) : null;
  const latestCheckIn = adminDb
    .collection('attendance')
    .where('memberId', '==', memberId)
    .orderBy('checkIn', 'desc')
    .limit(1);

  const outcome = await adminDb.runTransaction(async (tx) => {
    const [memberSnap, nonceSnap, latestSnap] = await Promise.all([
      tx.get(memberRef),
      nonceRef ? tx.get(nonceRef) : null,
      tx.get(latestCheckIn),
    ]);

    if (nonceSnap?.exists) {
      throw new HttpError(409, 'This QR code has already been used. Ask the member to show the new code.', {
        code: 'qr-used',
      });
    }
    if (!memberSnap.exists) throw notFound();
    const member = memberSnap.data();
    if (member.role !== 'member') {
      throw new HttpError(400, `This is a ${member.role} account, not a gym member.`, { code: 'not-a-member' });
    }
    if (member.status === 'disabled') {
      throw new HttpError(403, 'Account deactivated. Entry refused.', { code: 'account-disabled' });
    }

    const nowMs = Date.now();
    const burnNonce = () =>
      nonceRef &&
      tx.create(nonceRef, {
        memberId,
        usedAt: FieldValue.serverTimestamp(),
        // Safe to delete after this; enable a Firestore TTL policy on expireAt.
        expireAt: Timestamp.fromMillis(qr.expiresAt + DAY_MS),
      });

    // Same member scanned again moments ago: don't log or charge twice.
    const latest = latestSnap.docs[0];
    const latestAt = latest && toMillis(latest.get('checkIn'));
    if (latestAt && nowMs - latestAt < DUPLICATE_WINDOW_MS && latest.get('status') === 'Active') {
      burnNonce();
      return { duplicate: true, attendanceId: latest.id, member, checkedInAt: latestAt };
    }

    const status = getSubscriptionStatus(member.subscription, nowMs);
    if (!status.active) {
      throw new HttpError(403, noAccessMessage(status), { code: 'no-active-plan', reason: status.reason });
    }

    let subscription = member.subscription;
    if (status.plan === 'session') {
      subscription = { ...subscription, sessionCredits: status.credits - 1 };
      tx.update(memberRef, { 'subscription.sessionCredits': status.credits - 1 });
    }

    const attendanceRef = adminDb.collection('attendance').doc();
    tx.create(attendanceRef, {
      memberId,
      memberName: member.name ?? '',
      checkIn: FieldValue.serverTimestamp(),
      checkOut: null,
      status: 'Active',
      method: qr ? 'qr' : 'manual',
      plan: status.plan,
      checkedInBy: { uid: staffId, name: staff.name ?? '' },
    });
    burnNonce();
    return { duplicate: false, attendanceId: attendanceRef.id, member: { ...member, subscription }, checkedInAt: nowMs };
  });

  const { member } = outcome;
  send(res, 200, {
    duplicate: outcome.duplicate,
    attendanceId: outcome.attendanceId,
    checkedInAt: outcome.checkedInAt,
    member: {
      id: memberId,
      name: member.name ?? '',
      email: member.email ?? '',
      subscription: {
        plan: member.subscription?.plan ?? null,
        expiresAt: toMillis(member.subscription?.expiresAt),
        sessionCredits: member.subscription?.sessionCredits ?? 0,
      },
    },
  });
});
