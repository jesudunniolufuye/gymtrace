// POST /api/admin/set-account-status (admin only): deactivate or reactivate
// an account. Replaces deleting users: payment and attendance records are
// financial/attendance history and are kept.
//
// Body: { userId, action: 'deactivate' | 'reactivate', reason? }
//
// Deactivating:
//   - disables the Firebase Auth login (cannot sign in again)
//   - revokes refresh tokens, so open sessions end; every API also checks
//     revocation, and the Firestore rules refuse a 'disabled' profile at once
//   - sets the profile to status 'disabled', remembering the previous status
// Reactivating reverses all three.
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../_lib/firebaseAdmin.js';
import { HttpError, apiHandler, readJson, requireUser, send } from '../_lib/http.js';

const UID_PATTERN = /^[A-Za-z0-9]{10,128}$/;

export default apiHandler('/admin/set-account-status', ['POST'], async (req, res) => {
  const { uid: staffId, profile: staff } = await requireUser(req, { roles: ['admin'] });
  const body = await readJson(req);

  const action = body.action;
  if (!['deactivate', 'reactivate'].includes(action)) {
    throw new HttpError(400, 'Choose deactivate or reactivate.', { field: 'action' });
  }
  const reason = String(body.reason ?? '').trim();
  if (reason.length > 200) throw new HttpError(400, 'Reason is too long (max 200 characters).', { field: 'reason' });

  const userId = String(body.userId ?? '');
  if (!UID_PATTERN.test(userId)) throw new HttpError(404, 'User not found.', { code: 'user-not-found' });
  if (userId === staffId) {
    throw new HttpError(400, "You can't deactivate your own account.", { code: 'self' });
  }

  const ref = adminDb.doc(`users/${userId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'User not found.', { code: 'user-not-found' });
  const user = snap.data();
  const by = { uid: staffId, name: staff.name ?? '' };

  if (action === 'deactivate') {
    if (user.status !== 'disabled') {
      // Login first: if anything below fails, the person is still locked out.
      await adminAuth.updateUser(userId, { disabled: true });
      await adminAuth.revokeRefreshTokens(userId);
      await ref.update({
        status: 'disabled',
        statusBeforeDeactivation: user.status ?? 'active',
        deactivatedAt: FieldValue.serverTimestamp(),
        deactivatedBy: by,
        deactivationReason: reason || null,
      });
    }
    return send(res, 200, { userId, status: 'disabled' });
  }

  // Reactivate.
  let status = user.status;
  if (user.status === 'disabled') {
    const previous = user.statusBeforeDeactivation;
    status = previous && previous !== 'disabled' ? previous : user.role === 'trainer' ? 'inactive' : 'active';
    await ref.update({
      status,
      statusBeforeDeactivation: FieldValue.delete(),
      reactivatedAt: FieldValue.serverTimestamp(),
      reactivatedBy: by,
    });
  }
  await adminAuth.updateUser(userId, { disabled: false });
  send(res, 200, { userId, status });
});
