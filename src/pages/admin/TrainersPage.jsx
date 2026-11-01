import React, { useState, useEffect } from 'react';
import { Search, Star, Users, Briefcase, Edit, X, Loader2, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getAllTrainers, updateTrainer } from '../../services/trainerService';
import AccountStatusModal from './components/AccountStatusModal';
import { initialsOf } from '../../lib/display';

// Trainer status (set by the gym): 'active' = approved for booking,
// 'inactive' = not approved (new trainers start here), 'disabled' = account
// deactivated (cannot sign in). Separately, the trainer can pause new
// bookings themselves (available: false, FR13).
const STATUS_LABEL = { active: 'Approved', inactive: 'Not approved', disabled: 'Deactivated' };
const STATUS_COLOR = { active: 'text-green-600', inactive: 'text-amber-600', disabled: 'text-red-600' };

const TrainersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [statusFor, setStatusFor] = useState(null); // trainer being (de)activated
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(null); // uid being approved/hidden

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const data = await getAllTrainers();
      setTrainers(data);
    } catch (error) { console.error(error);
      toast.error('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrainers(); }, []);

  const filteredTrainers = trainers.filter(trainer =>
    (trainer.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (trainer.specialty || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (trainer) => {
    setEditModal({
      uid: trainer.uid,
      name: trainer.name || '',
      email: trainer.email || '',
      phone: trainer.phone || '',
      specialty: trainer.specialty || '',
    });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateTrainer(editModal.uid, {
        name: editModal.name,
        phone: editModal.phone,
        specialty: editModal.specialty,
      });
      toast.success('Trainer updated');
      setEditModal(null);
      await fetchTrainers();
    } catch (error) { console.error(error);
      toast.error('Failed to update trainer');
    } finally {
      setSaving(false);
    }
  };

  // Approve a trainer for booking, or hide them from the booking page (FR13 admin side).
  const setBookable = async (trainer, bookable) => {
    setApproving(trainer.uid);
    try {
      await updateTrainer(trainer.uid, { status: bookable ? 'active' : 'inactive' });
      toast.success(bookable ? `${trainer.name} can now be booked` : `${trainer.name} is hidden from booking`);
      await fetchTrainers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update trainer');
    } finally {
      setApproving(null);
    }
  };

  const getInitials = initialsOf;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trainer Management</h1>
          <p className="text-gray-500">Approve trainers for booking and see who is taking bookings</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            aria-label="Search trainers" placeholder="Search trainers..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">{filteredTrainers.length} trainer{filteredTrainers.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Trainers Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredTrainers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No trainers found</p>
          <p className="text-gray-400 text-sm mt-1">Trainers will appear here once they register with a trainer role.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTrainers.map((trainer) => (
            <div key={trainer.uid} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow relative group">
              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1">
                <button aria-label={`Edit ${trainer.name}`} onClick={() => handleEdit(trainer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit size={16} />
                </button>
                {trainer.status === 'disabled' ? (
                  <button aria-label={`Reactivate ${trainer.name}`} title="Reactivate" onClick={() => setStatusFor(trainer)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <UserCheck size={16} />
                  </button>
                ) : (
                  <button aria-label={`Deactivate ${trainer.name}`} title="Deactivate" onClick={() => setStatusFor(trainer)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <UserX size={16} />
                  </button>
                )}
              </div>

              <div className="w-24 h-24 rounded-full bg-orange-100 mb-4 flex items-center justify-center text-orange-600 text-2xl font-semibold">
                {getInitials(trainer.name)}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-1">{trainer.name}</h3>
              <span className="text-sm text-gray-500 mb-4">{trainer.specialty || 'General'}</span>

              <div className="w-full grid grid-cols-2 gap-2 py-4 border-t border-b border-gray-100 mb-4">
                <div className="flex flex-col items-center">
                  <Briefcase size={16} className="text-purple-500 mb-1" />
                  <span className="text-xs text-gray-500">Status</span>
                  <span className={`text-xs font-medium ${STATUS_COLOR[trainer.status] ?? 'text-gray-600'}`}>
                    {STATUS_LABEL[trainer.status] ?? 'Not bookable'}
                  </span>
                  {trainer.status === 'active' && trainer.available === false && (
                    <span className="text-[11px] text-amber-600">Trainer has paused bookings</span>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <Star size={16} className="text-yellow-500 mb-1" />
                  <span className="text-xs text-gray-500">Email</span>
                  <span className="text-xs font-medium text-gray-700 truncate w-full">{trainer.email}</span>
                </div>
              </div>

              {trainer.status === 'disabled' ? (
                <p className="w-full py-2 text-sm text-gray-500">Reactivate to make changes</p>
              ) : (
                <button
                  onClick={() => setBookable(trainer, trainer.status !== 'active')}
                  disabled={approving === trainer.uid}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    trainer.status === 'active'
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {trainer.status === 'active' ? 'Hide from booking' : 'Approve for booking'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Edit Trainer</h2>
              <button onClick={() => setEditModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                <input type="text" value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input type="email" value={editModal.email} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <input type="tel" value={editModal.phone} onChange={(e) => setEditModal({ ...editModal, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Specialty</label>
                <input type="text" value={editModal.specialty} onChange={(e) => setEditModal({ ...editModal, specialty: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
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

      {statusFor && (
        <AccountStatusModal user={statusFor} onClose={() => setStatusFor(null)} onDone={() => fetchTrainers()} />
      )}
    </div>
  );
};

export default TrainersPage;
