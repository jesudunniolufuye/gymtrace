import React, { useState, useEffect } from 'react';
import { Save, Building, Mail, Phone, CreditCard, Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, saveSettings } from '../../services/settingsService';
import { updateUserDoc } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { PLANS, formatNaira } from '../../lib/subscription';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, userData, refreshUserData } = useAuth();
  const [myName, setMyName] = useState(userData?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [formData, setFormData] = useState({
    gymName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings();
        if (data) {
          setFormData({
            gymName: data.gymName || '',
            email: data.email || '',
            phone: data.phone || '',
          });
        }
      } catch (error) { console.error(error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(formData);
      toast.success('Settings saved successfully!');
    } catch (error) { console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // The signed-in admin's own name: shown as "Recorded by" on receipts and
  // check-ins they make from now on (earlier records keep the old name).
  const saveMyName = async () => {
    const name = myName.trim();
    if (name.length < 2 || name.length > 80) {
      toast.error('Enter your name (2 to 80 characters).');
      return;
    }
    setSavingName(true);
    try {
      await updateUserDoc(user.uid, { name });
      await refreshUserData();
      toast.success('Your name is saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save your name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
          <p className="text-gray-500">Your name, gym contact details and prices</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save size={20} />
          )}
          <span>Save Changes</span>
        </button>
      </div>

      {/* Your profile: the signed-in admin's own name */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b border-gray-100 pb-2">
          <UserCircle size={20} className="text-blue-500" />
          Your name
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Shown as “Recorded by” on receipts and check-ins you make from now on. Use your real name.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            aria-label="Your name"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            maxLength={80}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={saveMyName}
            disabled={savingName || myName.trim() === (userData?.name ?? '')}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingName && <Loader2 size={16} className="animate-spin" />}
            Save name
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* General Information */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-6 text-gray-900 font-semibold border-b border-gray-100 pb-2">
            <Building size={20} className="text-blue-500" />
            General Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Gym Name</label>
              <input
                type="text"
                name="gymName"
                value={formData.gymName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Support Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Membership Prices (read-only: set in code, used by the server) */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b border-gray-100 pb-2">
            <CreditCard size={20} className="text-green-500" />
            Membership Prices
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(PLANS).map((plan) => (
              <div key={plan.id} className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{plan.label}</p>
                <p className="text-xl font-bold text-gray-900">{formatNaira(plan.amount)}</p>
                <p className="text-xs text-gray-500 mt-1">{plan.summary}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Prices are fixed by the system and used for every payment. Ask the developer to change them.
          </p>
        </div>

      </form>
    </div>
  );
};

export default SettingsPage;
