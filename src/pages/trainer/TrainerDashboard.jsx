import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CheckCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { getTrainerClients, getTodayTrainerBookings, getTrainerBookings } from '../../services/bookingService';
import { setMyAvailability } from '../../services/trainerService';

/**
 * FR13: the trainer opens or closes their diary for NEW bookings. Existing
 * bookings are not affected. Separate from the gym's approval (status).
 */
const AvailabilityCard = ({ user, userData, refreshUserData }) => {
  const [saving, setSaving] = useState(false);
  const available = userData?.available !== false;
  const approved = userData?.status === 'active';

  const toggle = async () => {
    setSaving(true);
    try {
      await setMyAvailability(user.uid, !available);
      await refreshUserData();
      toast.success(!available ? 'You are open for new bookings' : 'You are hidden from new bookings');
    } catch (error) {
      console.error(error);
      toast.error('Could not update your availability');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-gray-900">
          {available ? 'Available for new bookings' : 'Not taking new bookings'}
        </p>
        <p className="text-sm text-gray-500">
          {!approved
            ? 'Your trainer profile is waiting for approval by the gym. Members can book you once it is approved.'
            : available
              ? 'Members can book sessions with you. Existing bookings are not affected if you switch this off.'
              : 'Members cannot book you. Your existing sessions still stand.'}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={available}
        aria-label="Available for new bookings"
        onClick={toggle}
        disabled={saving}
        className={`shrink-0 w-14 h-8 rounded-full p-1 transition-colors disabled:opacity-50 ${available ? 'bg-emerald-500' : 'bg-gray-300'}`}
      >
        <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${available ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
};

const TrainerDashboard = () => {
    const { user, userData, refreshUserData } = useAuth();
    const navigate = useNavigate();
    const firstName = userData?.name?.split(' ')[0] || 'Trainer';

    const [clientCount, setClientCount] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [upcomingSessions, setUpcomingSessions] = useState([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                setLoading(true);
                const [clients, today, allSessions] = await Promise.all([
                    getTrainerClients(user.uid),
                    getTodayTrainerBookings(user.uid),
                    getTrainerBookings(user.uid),
                ]);
                setClientCount(clients.length);
                setTodayCount(today.length);
                setCompletedCount(allSessions.filter((s) => s.status === 'completed').length);
                setUpcomingSessions(
                    allSessions.filter((s) => s.status === 'upcoming').slice(0, 5)
                );
            } catch (error) { console.error(error);
                // silent
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                        Welcome back, <span className="text-emerald-600">{firstName}</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Here's what's happening today.</p>
                </div>
                <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </div>

            <AvailabilityCard user={user} userData={userData} refreshUserData={refreshUserData} />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Active Clients</p>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '…' : clientCount}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                     <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Sessions Today</p>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '…' : todayCount}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                     <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Sessions Completed</p>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '…' : completedCount}</p>
                    </div>
                </div>
            </div>

            {/* Upcoming Sessions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Upcoming Sessions</h2>
                    <button 
                        onClick={() => navigate('/trainer/schedule')}
                        className="text-emerald-600 text-sm font-semibold hover:text-emerald-700 flex items-center gap-1"
                    >
                        View Schedule <ArrowRight size={16} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Session Type</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                                        <p className="text-gray-500 text-sm">Loading…</p>
                                    </td>
                                </tr>
                            ) : upcomingSessions.length > 0 ? (
                                upcomingSessions.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                                    {(s.memberName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-700 text-sm">{s.memberName || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{s.sessionType || 'Training'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(s.date)} · {s.time}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                <Clock size={12} /> Upcoming
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                       No upcoming sessions.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TrainerDashboard;
