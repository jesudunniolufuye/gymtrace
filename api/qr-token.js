// POST /api/qr-token: a fresh signed entry QR for a member with an active
// plan (FR8, FR9). The member's page asks for a new one before each expires.
import { HttpError, apiHandler, requireUser, send } from './_lib/http.js';
import { QR_TTL_MS, signQrToken } from './_lib/qrToken.js';
import { noAccessMessage } from './_lib/planMessages.js';
import { getSubscriptionStatus } from '../shared/subscription.js';

export default apiHandler('/qr-token', ['POST'], async (req, res) => {
  const { uid, profile } = await requireUser(req, { roles: ['member'] });

  const status = getSubscriptionStatus(profile.subscription);
  if (!status.active) {
    throw new HttpError(403, noAccessMessage(status), { code: 'no-active-plan', reason: status.reason });
  }

  const { token, expiresAt } = signQrToken({ uid });
  send(res, 200, { token, expiresAt, ttlMs: QR_TTL_MS });
});
