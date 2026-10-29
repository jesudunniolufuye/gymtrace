import React, { useState } from 'react';
import { AlertTriangle, Loader2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { setAccountStatus } from '../../../services/accountService';
import { ApiError } from '../../../services/apiClient';

/**
 * Confirm deactivating or reactivating an account. Replaces deleting
 * people: their payments and attendance stay on record.
 */
const AccountStatusModal = ({ user, onClose, onDone }) => {
  const deactivating = user.status !== 'disabled';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await setAccountStatus(user.uid, deactivating ? 'deactivate' : 'reactivate', reason.trim());
      toast.success(`${user.name} ${deactivating ? 'deactivated' : 'reactivated'}`);
      onDone?.();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      if (!(e instanceof ApiError)) console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="account-status-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${deactivating ? 'bg-red-100' : 'bg-green-100'}`}>
          {deactivating ? <UserX className="text-red-600" size={24} /> : <UserCheck className="text-green-600" size={24} />}
        </div>
        <div className="text-center">
          <h2 id="account-status-title" className="text-lg font-bold text-gray-900">
            {deactivating ? 'Deactivate account' : 'Reactivate account'}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {deactivating ? (
              <>
                <span className="font-medium text-gray-900">{user.name}</span> will be signed out and won't be able to sign in or check in
                until reactivated. Their payments and attendance stay on record. Any plan keeps running while deactivated.
              </>
            ) : (
              <>
                <span className="font-medium text-gray-900">{user.name}</span> will be able to sign in again
                {user.role === 'member' ? ' and use any plan time they have left.' : '.'}
              </>
            )}
          </p>
        </div>

        {deactivating && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700 block mb-1">Reason (optional, kept on record)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
        )}

        {error && (
          <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={busy} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50">Cancel</button>
          <button
            onClick={confirm}
            disabled={busy}
            className={`flex-1 py-2 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${deactivating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {deactivating ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountStatusModal;
