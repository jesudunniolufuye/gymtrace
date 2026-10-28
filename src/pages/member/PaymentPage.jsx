import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle, Calendar, CheckCircle, CreditCard, Loader2, ShieldCheck, Store, Ticket, X, XCircle, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPaymentHistory, getPaymentOptions, payForPlan } from '../../services/paymentService';
import { ApiError } from '../../services/apiClient';
import { DAY_MS } from '../../../shared/subscription.js';
import { TEST_CARDS, cvcValid, expiryValid, luhnValid } from '../../../shared/card.js';
import { PLANS, formatDate, formatNaira, getSubscriptionStatus, toMillis } from '../../lib/subscription';

// Client-side checks give instant feedback; the server repeats them.
const cardSchema = z.object({
  name: z.string().trim().min(2, 'Enter the name on the card').max(60, 'Name is too long'),
  number: z.string().refine(luhnValid, 'Card number is not valid'),
  expiry: z.string().refine((v) => expiryValid(v), 'Use MM/YY and a date that has not passed'),
  cvc: z.string().refine(cvcValid, 'CVC must be 3 or 4 digits'),
});

const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const PaymentPage = () => {
  const { user, userData, refreshUserData } = useAuth();
  // Time is read once per render cycle (and refreshed after each checkout).
  const [now, setNow] = useState(() => Date.now());
  const status = getSubscriptionStatus(userData?.subscription, now);

  const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState('loading'); // loading | ready | error
  const [historyVersion, setHistoryVersion] = useState(0);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  // null while loading; false in production (pay at the front desk).
  const [cardSimulator, setCardSimulator] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPaymentOptions()
      .then((options) => !cancelled && setCardSimulator(options.cardSimulator === true))
      .catch((error) => {
        console.error('Failed to load payment options', error);
        if (!cancelled) setCardSimulator(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getPaymentHistory(user.uid);
        if (!cancelled) {
          setHistory(rows);
          setHistoryState('ready');
        }
      } catch (error) {
        console.error('Failed to load payment history', error);
        if (!cancelled) setHistoryState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, historyVersion]);

  const afterCheckout = async (succeeded) => {
    setHistoryVersion((v) => v + 1);
    if (succeeded) {
      await refreshUserData();
      setNow(Date.now());
      setCheckoutPlan(null);
    }
  };

  const monthlyActive = status.active && status.plan === 'monthly';

  return (
    <div className="p-6 lg:p-10 min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-background-dark">Payments & Billing</h1>
          <p className="text-gray-500 mt-1">Your plan, prices, and payment history with receipts.</p>
        </div>

        <CurrentPlanCard status={status} now={now} />

        {cardSimulator === false && (
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <Store size={22} className="shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold mb-1">Pay at the front desk</p>
              <p>
                Pay by cash or bank transfer at the Fitness Centre front desk (ask staff for transfer details).
                Staff record your payment and your plan starts immediately. Your receipt appears in Payment History below.
              </p>
            </div>
          </div>
        )}

        {/* Plan options (FR5) */}
        <div className="grid md:grid-cols-2 gap-6">
          <PlanOption
            plan={PLANS.monthly}
            icon={<Zap size={20} className="text-amber-500" />}
            perks={['Unlimited entry for 30 days', 'QR code access every day', 'Renew early and keep your remaining days']}
            current={monthlyActive}
            payable={cardSimulator}
            buttonLabel={monthlyActive ? `Renew (+30 days) · ${formatNaira(PLANS.monthly.amount)}` : `Pay ${formatNaira(PLANS.monthly.amount)}`}
            onSelect={() => setCheckoutPlan(PLANS.monthly)}
          />
          <PlanOption
            plan={PLANS.session}
            icon={<Ticket size={20} className="text-emerald-600" />}
            perks={['One gym entry (pay-per-session)', 'Valid until midnight today', 'Buy another for a second visit the same day']}
            current={status.active && status.plan === 'session'}
            disabledReason={monthlyActive ? 'Not needed while your monthly membership is active.' : null}
            payable={cardSimulator}
            buttonLabel={`Pay ${formatNaira(PLANS.session.amount)}`}
            onSelect={() => setCheckoutPlan(PLANS.session)}
          />
        </div>

        <PaymentHistory rows={history} state={historyState} />
      </div>

      {checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onFinished={afterCheckout}
        />
      )}
    </div>
  );
};

const CurrentPlanCard = ({ status, now }) => {
  let title = 'No active plan';
  let detail = 'Choose a plan below to get gym access and your entry QR code.';

  if (status.active && status.plan === 'monthly') {
    const daysLeft = Math.max(1, Math.ceil((status.expiresAt - now) / DAY_MS));
    title = PLANS.monthly.label;
    detail = `Valid until ${formatDate(status.expiresAt)} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  } else if (status.active && status.plan === 'session') {
    title = PLANS.session.label;
    detail = `${status.credits} entr${status.credits === 1 ? 'y' : 'ies'} left · valid until midnight tonight`;
  } else if (status.reason === 'expired' && status.plan === 'monthly') {
    detail = `Your monthly membership expired on ${formatDate(status.expiresAt)}. Renew below.`;
  } else if (status.reason === 'expired') {
    detail = 'Your day pass has expired. Buy a new one below.';
  } else if (status.reason === 'used') {
    detail = "You've used today's day pass. Buy another below for another entry.";
  }

  return (
    <div className="bg-background-dark text-white rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Current plan</p>
        <h2 className="text-2xl font-display font-bold">{title}</h2>
        <p className="text-gray-300 text-sm mt-1">{detail}</p>
      </div>
      <span
        className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border ${
          status.active ? 'bg-primary/20 text-primary border-primary/30' : 'bg-gray-700/50 text-gray-300 border-gray-600'
        }`}
      >
        {status.active ? 'ACTIVE' : 'INACTIVE'}
      </span>
    </div>
  );
};

// payable: true = card checkout (staging), false = front desk only, null = loading.
const PlanOption = ({ plan, icon, perks, current, disabledReason, payable, buttonLabel, onSelect }) => (
  <div className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col ${current ? 'border-primary' : 'border-gray-100'}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-display font-bold text-background-dark">{plan.label}</h3>
      </div>
      {current && <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary text-white">CURRENT</span>}
    </div>
    <p className="text-3xl font-bold text-gray-900">
      {formatNaira(plan.amount)}
      <span className="text-base font-normal text-gray-400">{plan.id === 'monthly' ? ' / 30 days' : ' / entry'}</span>
    </p>
    <ul className="mt-4 mb-6 space-y-2 text-sm text-gray-600">
      {perks.map((perk) => (
        <li key={perk} className="flex items-center gap-2">
          <CheckCircle size={16} className="text-primary shrink-0" />
          {perk}
        </li>
      ))}
    </ul>
    {payable === false ? (
      <p className="mt-auto text-sm font-semibold text-gray-600 text-center py-2.5 rounded-lg bg-gray-50 border border-gray-100">
        Pay at the front desk
      </p>
    ) : (
      <button
        onClick={onSelect}
        disabled={payable !== true || Boolean(disabledReason)}
        className="mt-auto w-full py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
      >
        {payable === null ? 'Loading…' : buttonLabel}
      </button>
    )}
    {disabledReason && <p className="text-xs text-gray-500 mt-2">{disabledReason}</p>}
  </div>
);

const TEST_CARD_BUTTONS = [
  { label: 'Success', number: TEST_CARDS.success },
  { label: 'Declined', number: TEST_CARDS.declined },
  { label: 'Insufficient funds', number: TEST_CARDS.insufficientFunds },
];

const groupDigits = (n) => n.replace(/(\d{4})(?=\d)/g, '$1 ');

/** Simulated card checkout (FR6). No real money moves. */
const CheckoutModal = ({ plan, onClose, onFinished }) => {
  // One key per attempt: a network retry reuses it so nobody is charged twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(cardSchema),
    defaultValues: { name: '', number: '', expiry: '', cvc: '' },
  });

  const onSubmit = async (card) => {
    setServerError(null);
    try {
      await payForPlan({ plan: plan.id, card, idempotencyKey });
      toast.success(`Payment successful: ${plan.label} is now active.`);
      await onFinished(true);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error(error);
        setServerError('Something went wrong. Please try again.');
        return;
      }
      if (error.status === 0) {
        // Network problem: keep the same key so a retry can't double-charge.
        setServerError(error.message);
        return;
      }
      setIdempotencyKey(newIdempotencyKey());
      if (error.status === 400 && error.data.field) {
        setError(error.data.field, { message: error.message });
      } else {
        setServerError(error.message);
      }
      if (error.status === 402) await onFinished(false); // failed attempt now shows in history
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 ${
      errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 id="checkout-title" className="font-bold text-gray-900">Checkout</h3>
          <button onClick={onClose} disabled={isSubmitting} aria-label="Close" className="text-gray-400 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap justify-between items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
            <span className="font-semibold text-gray-800">{plan.label}</span>
            <span className="font-bold text-gray-900 whitespace-nowrap">{formatNaira(plan.amount)}</span>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <ShieldCheck size={14} /> Simulated payment gateway. No real money is charged.
            </p>
            <p className="mb-2">Use a test card (any future expiry, any 3-digit CVC):</p>
            <div className="flex flex-wrap gap-2">
              {TEST_CARD_BUTTONS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setValue('number', groupDigits(c.number), { shouldValidate: true })}
                  className="px-2 py-1 rounded border border-blue-200 bg-white font-mono hover:bg-blue-100"
                >
                  {c.label}: {groupDigits(c.number)}
                </button>
              ))}
            </div>
          </div>

          <Field label="Name on card" error={errors.name}>
            <input {...register('name')} autoComplete="off" className={inputClass('name')} placeholder="Ada Okafor" />
          </Field>
          <Field label="Card number" error={errors.number}>
            <input {...register('number')} autoComplete="off" inputMode="numeric" className={`${inputClass('number')} font-mono`} placeholder="0000 0000 0000 0000" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry (MM/YY)" error={errors.expiry}>
              <input {...register('expiry')} autoComplete="off" inputMode="numeric" className={inputClass('expiry')} placeholder="12/28" />
            </Field>
            <Field label="CVC" error={errors.cvc}>
              <input {...register('cvc')} autoComplete="off" inputMode="numeric" className={inputClass('cvc')} placeholder="123" />
            </Field>
          </div>

          {serverError && (
            <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Processing payment…
              </>
            ) : (
              <>
                <CreditCard size={18} /> Pay {formatNaira(plan.amount)}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
    {error && <span className="block text-xs text-red-600 mt-1">{error.message}</span>}
  </label>
);

/** FR7: the member's payment history, including failed attempts. */
const PaymentHistory = ({ rows, state }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="p-6 border-b border-gray-100">
      <h3 className="text-lg font-display font-bold text-background-dark">Payment History</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium">Plan</th>
            <th className="px-6 py-3 font-medium">Amount</th>
            <th className="px-6 py-3 font-medium">Card</th>
            <th className="px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {state === 'loading' && (
            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading payments…</td></tr>
          )}
          {state === 'error' && (
            <tr><td colSpan="5" className="px-6 py-8 text-center text-red-600">Could not load your payment history. Refresh to try again.</td></tr>
          )}
          {state === 'ready' && rows.length === 0 && (
            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No payments yet.</td></tr>
          )}
          {state === 'ready' &&
            rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    {formatDate(toMillis(p.createdAt), true)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{p.reference}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-800">
                  {p.planLabel}
                  {p.status === 'success' && p.periodEnd && (
                    <div className="text-xs text-gray-400">
                      {p.plan === 'monthly' ? `until ${formatDate(toMillis(p.periodEnd))}` : 'valid on day of purchase'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatNaira(p.amount)}</td>
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{p.cardBrand} •••• {p.cardLast4}</td>
                <td className="px-6 py-4">
                  {p.status === 'success' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                      <CheckCircle size={12} /> Paid
                    </span>
                  ) : (
                    <span title={p.failureReason} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-100">
                      <XCircle size={12} /> Failed
                    </span>
                  )}
                  {p.status !== 'success' && p.failureReason && (
                    <div className="text-xs text-gray-400 mt-1">{p.failureReason}</div>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default PaymentPage;
