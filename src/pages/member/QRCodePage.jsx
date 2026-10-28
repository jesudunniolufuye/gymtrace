import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Shield, User, Clock, Lightbulb, CalendarCheck, Headset, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiPost, ApiError } from '../../services/apiClient';
import { describeSubscription } from '../../lib/subscription';
import logo from '../../assets/logo.png';

// Ask for the next code a few seconds before the current one expires, so the
// member never shows a code that dies while the staff member is scanning.
const REFRESH_BEFORE_MS = 5000;

/**
 * Entry QR code (FR8, FR9). The code is a short-lived token signed by the
 * server; this page only displays it and fetches a new one before it expires.
 * The server decides whether the member may have one (active plan, account
 * not deactivated).
 */
const QRCodePage = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const [qr, setQr] = useState(null); // { token, expiresAt }
  const [view, setView] = useState('loading'); // loading | ready | no-access | error
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [version, setVersion] = useState(0); // bump to fetch a new code

  const expiresAtRef = useRef(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    fetchingRef.current = true;
    apiPost('qr-token')
      .then((data) => {
        if (cancelled) return;
        expiresAtRef.current = data.expiresAt;
        setQr({ token: data.token, expiresAt: data.expiresAt });
        setView('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        expiresAtRef.current = null;
        setQr(null);
        if (error instanceof ApiError && error.status === 403) {
          setView('no-access');
          setMessage(error.message);
        } else {
          console.error('Failed to get QR code', error);
          setView('error');
          setMessage(error.message || 'Could not get your QR code.');
        }
      })
      .finally(() => {
        fetchingRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  // One-second tick for the countdown; also triggers the refresh.
  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (expiresAtRef.current && expiresAtRef.current - t <= REFRESH_BEFORE_MS && !fetchingRef.current) {
        fetchingRef.current = true;
        setVersion((v) => v + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = qr ? Math.max(0, Math.ceil((qr.expiresAt - now) / 1000)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-8">
      <nav className="flex justify-between items-center p-6 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="GymTrace" className="h-8 w-auto" />
          <span className="font-bold text-slate-800 tracking-tight">GYMTRACE</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{userData?.name || 'Member'}</p>
            <p className="text-xs text-slate-500">{userData?.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500 shadow-sm">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 mt-8 flex flex-col items-center">
        <div className="text-center mb-8 max-w-lg">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Access QR Code</h1>
          <p className="text-slate-500 font-medium">Show this at the front desk. The code changes every minute.</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl w-full max-w-sm flex flex-col items-center relative overflow-hidden">
          {view === 'loading' && (
            <div className="py-16 flex flex-col items-center text-slate-500">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              Getting your code…
            </div>
          )}

          {view === 'no-access' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex justify-center items-center mb-4">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No Gym Access Right Now</h2>
              <p className="text-sm text-slate-500 mb-6 px-4">{message}</p>
              <button
                onClick={() => navigate('/member/payments')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-200"
              >
                See Plans & Payments
              </button>
            </div>
          )}

          {view === 'error' && (
            <div className="flex flex-col items-center text-center py-6">
              <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-sm text-slate-600 mb-6">{message}</p>
              <button
                onClick={() => setVersion((v) => v + 1)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl"
              >
                Try Again
              </button>
            </div>
          )}

          {view === 'ready' && qr && (
            <>
              <div className="bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full flex items-center space-x-2 mb-8">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>VALID ACCESS</span>
              </div>

              <div className="relative p-4 border-2 border-dashed border-slate-200 rounded-2xl mb-8 bg-white shadow-inner">
                <div className="bg-white p-2 rounded-xl" data-testid="entry-qr">
                  <QRCode value={qr.token} size={220} level="M" />
                </div>
              </div>

              <div className="text-center mb-6 w-full">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={16} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Code changes in</p>
                </div>
                <h2 className={`text-4xl font-black font-mono tracking-tighter ${secondsLeft <= 10 ? 'text-amber-500' : 'text-slate-900'}`}>
                  0:{String(secondsLeft).padStart(2, '0')}
                </h2>
              </div>

              <button
                onClick={() => setVersion((v) => v + 1)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                <RefreshCw className="w-5 h-5" />
                <span>New Code Now</span>
              </button>

              <div className="w-full border-t border-slate-100 mt-6 pt-4 flex items-center justify-center space-x-2 text-slate-400">
                <Shield className="w-3 h-3" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Signed by GymTrace · works once</p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8 max-w-4xl">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <Lightbulb className="w-8 h-8 text-emerald-500 mb-3 bg-emerald-50 p-1.5 rounded-lg" />
            <h3 className="font-bold text-slate-800 text-sm mb-1">Scanning Tip</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Turn your screen brightness up. Screenshots won't work: the code expires.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <CalendarCheck className="w-8 h-8 text-emerald-500 mb-3 bg-emerald-50 p-1.5 rounded-lg" />
            <h3 className="font-bold text-slate-800 text-sm mb-1">Your Plan</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{describeSubscription(userData?.subscription, now)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <Headset className="w-8 h-8 text-emerald-500 mb-3 bg-emerald-50 p-1.5 rounded-lg" />
            <h3 className="font-bold text-slate-800 text-sm mb-1">Phone Not Working?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Staff can check you in with your email address.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;
