import React, { useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ScanLine, CheckCircle, XCircle, User, Search, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '../../services/apiClient';
import { describeSubscription, formatTime } from '../../lib/subscription';

/**
 * Front-desk check-in (FR10, FR11, FR12, TC2).
 * The camera only reads the QR text; the server verifies the code, the
 * member and their payment, then logs the check-in.
 */
const ScannerPage = () => {
  // { kind: 'granted' | 'duplicate' | 'denied', member?, message?, checkedInAt? }
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [manualEntry, setManualEntry] = useState('');
  const [processing, setProcessing] = useState(false);
  // The camera fires many times a second; a ref blocks overlapping requests.
  const busyRef = useRef(false);

  const checkIn = async (body) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    try {
      const data = await apiPost('check-in', body);
      if (data.duplicate) {
        setResult({ kind: 'duplicate', member: data.member, checkedInAt: data.checkedInAt });
        toast.warning(`${data.member.name} is already checked in`);
      } else {
        setResult({ kind: 'granted', member: data.member, checkedInAt: data.checkedInAt });
        toast.success(`Access Granted: ${data.member.name}`);
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Check-in failed. Please try again.';
      if (!(error instanceof ApiError)) console.error(error);
      setResult({ kind: 'denied', message });
      toast.error(message);
    } finally {
      busyRef.current = false;
      setProcessing(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const value = manualEntry.trim();
    if (!value) return;
    checkIn({ member: value });
    setManualEntry('');
  };

  const handleCameraError = (err) => {
    console.error(err);
    if (err?.name === 'NotAllowedError') setCameraError('Camera permission denied.');
    else if (err?.name === 'NotFoundError') setCameraError('No camera found on this device.');
  };

  const granted = result?.kind === 'granted';
  const duplicate = result?.kind === 'duplicate';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Check-in Scanner</h1>
        <p className="text-slate-500">Scan the member's QR code, or check them in by email or member ID.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black rounded-2xl overflow-hidden shadow-lg relative aspect-video flex items-center justify-center">
            {!result ? (
              <div className="w-full h-full relative">
                <Scanner
                  paused={processing}
                  onScan={(codes) => {
                    if (codes?.length > 0 && codes[0].rawValue) checkIn({ token: codes[0].rawValue });
                  }}
                  onError={handleCameraError}
                  styles={{ container: { width: '100%', height: '100%', objectFit: 'cover' } }}
                  components={{ audio: false, finder: false }}
                />
                <div className="absolute inset-0 border-2 border-white/30 m-12 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-emerald-500/50 rounded-lg animate-pulse"></div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
                  {processing ? 'Checking…' : 'Point the camera at the QR code'}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-8 text-center" role="status">
                <div
                  className={`p-6 rounded-full border mb-4 ${
                    granted ? 'bg-emerald-500/10 border-emerald-500/20' : duplicate ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  {granted && <CheckCircle size={64} className="text-emerald-500" />}
                  {duplicate && <Clock size={64} className="text-amber-400" />}
                  {result.kind === 'denied' && <XCircle size={64} className="text-red-500" />}
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${granted ? 'text-white' : duplicate ? 'text-amber-300' : 'text-red-400'}`}>
                  {granted ? 'Access Granted' : duplicate ? 'Already Checked In' : 'Access Denied'}
                </h3>
                <p className="text-slate-300 mb-6">
                  {granted && `${result.member.name} is checked in.`}
                  {duplicate && `${result.member.name} was checked in at ${formatTime(result.checkedInAt)}. No extra entry was used.`}
                  {result.kind === 'denied' && result.message}
                </p>
                <button
                  onClick={() => setResult(null)}
                  autoFocus
                  className="bg-white text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <ScanLine size={18} />
                  Scan Next Member
                </button>
              </div>
            )}

            {cameraError && !result && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-20 p-8 text-center">
                <div className="max-w-sm">
                  <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Camera Error</h3>
                  <p className="text-slate-400 text-sm">{cameraError}</p>
                  <p className="text-slate-500 text-xs mt-4">Check browser permissions or use manual check-in.</p>
                </div>
              </div>
            )}
          </div>

          {(granted || duplicate) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 shrink-0">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{result.member.name}</h3>
                  <p className="text-sm text-slate-500">{result.member.email}</p>
                  <p className="text-sm text-emerald-700 font-medium">{describeSubscription(result.member.subscription)}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Member ID</p>
                <p className="font-mono text-slate-700 text-xs break-all">{result.member.id}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={18} className="text-slate-400" />
              Manual Check-in
            </h3>
            <form onSubmit={handleManualSubmit}>
              <div className="mb-4">
                <label htmlFor="manual-entry" className="block text-sm font-medium text-slate-500 mb-1.5">Email or member ID</label>
                <input
                  id="manual-entry"
                  type="text"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  placeholder="name@babcock.edu.ng"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!manualEntry.trim() || processing}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {processing ? 'Checking…' : 'Check In'}
              </button>
            </form>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <h3 className="font-bold text-emerald-800 mb-2">How check-in works</h3>
            <ul className="space-y-2 text-sm text-emerald-700/80 list-disc pl-4">
              <li>Each QR code lasts one minute and works once. Screenshots are refused.</li>
              <li>Members need an active plan. A day pass is used up on entry.</li>
              <li>Scanning the same member twice within 5 minutes doesn't use another entry.</li>
              <li>Compare the name shown with the person in front of you.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
