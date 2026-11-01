import React, { useState, useEffect } from 'react';
import { Search, Edit, User, X, Loader2, Banknote, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getAllMembers, updateMember } from '../../services/memberService';
import RecordPaymentModal from './components/RecordPaymentModal';
import AccountStatusModal from './components/AccountStatusModal';
import { PLANS, formatDate as formatLagosDate, getSubscriptionStatus } from '../../lib/subscription';
import { initialsOf } from '../../lib/display';

/** FR18: each member's real plan, from the server-written subscription. */
const PlanBadge = ({ subscription, now }) => {
  const s = getSubscriptionStatus(subscription, now);
  if (s.active) {
    const detail = s.plan === 'monthly' ? `until ${formatLagosDate(s.expiresAt)}` : `${s.credits} entr${s.credits === 1 ? 'y' : 'ies'} today`;
    return (
      <div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-100">
          {PLANS[s.plan].label}
        </span>
        <div className="text-xs text-gray-500 mt-1">{detail}</div>
      </div>
    );
  }
  if (s.reason === 'expired' || s.reason === 'used') {
    return (
      <div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-100">
          {s.reason === 'used' ? 'Day pass used' : `${s.label} expired`}
        </span>
        {s.reason === 'expired' && s.plan === 'monthly' && (
          <div className="text-xs text-gray-500 mt-1">on {formatLagosDate(s.expiresAt)}</div>
        )}
      </div>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200">
      No plan
    </span>
  );
};

const MembersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [statusFor, setStatusFor] = useState(null); // member being (de)activated
  const [saving, setSaving] = useState(false);
  const [recordFor, setRecordFor] = useState(null); // member receiving a payment
  const [now, setNow] = useState(() => Date.now());

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await getAllMembers();
      setMembers(data);
      setNow(Date.now());
    } catch (error) {
      console.error(error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const filteredMembers = members.filter(member =>
    (member.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (member) => {
    setEditModal({
      uid: member.uid,
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
    });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateMember(editModal.uid, {
        name: editModal.name,
        phone: editModal.phone,
      });
      toast.success('Member updated');
      setEditModal(null);
      await fetchMembers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
          <p className="text-gray-500">Members, their plans, and front-desk payments</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            aria-label="Search members" placeholder="Search members..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">{filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Plan</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Joined Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-gray-500 text-sm">Loading members…</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No members found</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {initialsOf(member.name)}
                        </div>
                        <div className="min-w-0 max-w-[16rem]">
                          <div className="font-medium text-gray-900 break-words">{member.name}</div>
                          <div className="text-sm text-gray-500 break-all">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <PlanBadge subscription={member.subscription} now={now} />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        title={member.status === 'disabled' && member.deactivationReason ? `Reason: ${member.deactivationReason}` : undefined}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          member.status === 'disabled'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-green-50 text-green-700 border-green-100'
                        }`}
                      >
                        {member.status === 'disabled' ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setRecordFor(member)}
                          disabled={member.status === 'disabled'}
                          title={member.status === 'disabled' ? 'Reactivate the account first' : undefined}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Banknote size={16} />
                          Record payment
                        </button>
                        <button
                          aria-label={`Edit ${member.name}`}
                          onClick={() => handleEdit(member)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        {member.status === 'disabled' ? (
                          <button
                            aria-label={`Reactivate ${member.name}`}
                            title="Reactivate"
                            onClick={() => setStatusFor(member)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <UserCheck size={18} />
                          </button>
                        ) : (
                          <button
                            aria-label={`Deactivate ${member.name}`}
                            title="Deactivate"
                            onClick={() => setStatusFor(member)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <UserX size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Edit Member</h2>
              <button onClick={() => setEditModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input type="email" value={editModal.email} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editModal.phone}
                  onChange={(e) => setEditModal({ ...editModal, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                Plans change only through payments (“Record payment”). To block access, use Deactivate.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {recordFor && (
        <RecordPaymentModal
          member={recordFor}
          onClose={() => setRecordFor(null)}
          onRecorded={() => fetchMembers()}
        />
      )}

      {statusFor && (
        <AccountStatusModal user={statusFor} onClose={() => setStatusFor(null)} onDone={() => fetchMembers()} />
      )}
    </div>
  );
};

export default MembersPage;
