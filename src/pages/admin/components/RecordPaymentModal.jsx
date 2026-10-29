import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { recordFrontDeskPayment } from '../../../services/paymentService';
import { ApiError } from '../../../services/apiClient';
import { PLANS, describeSubscription, formatNaira, getSubscriptionStatus } from '../../../lib/subscription';

const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

/** Same rules as the server; the server checks again. */
function validate({ plan, method, amount, externalReference, note }) {
  const errors = {};
  const n = Number(amount);
  if (!/^\d+$/.test(String(amount).trim()) || n < 1) errors.amount = 'Enter the amount received in whole naira.';
  if (method === 'transfer' && externalReference.trim().length < 3) errors.externalReference = 'Enter the bank transfer reference.';
  if (!errors.amount && n !== PLANS[plan].amount && note.trim().length < 3) {
    errors.note = `The amount differs from the plan price (${formatNaira(PLANS[plan].amount)}). Add a note explaining why.`;
  }
  return errors;
}

/**
 * Admin form for a payment taken at the front desk (cash or bank transfer).
 * The server records the payment, extends the member's plan and issues the
 * receipt; this form only collects the details.
 */
const RecordPaymentModal = ({ member, onClose, onRecorded }) => {
  const [now] = useState(() => Date.now());
  const current = getSubscriptionStatus(member.subscription, now);
  const monthlyActive = current.active && current.plan === 'monthly';

  const [form, setForm] = useState({
    plan: 'monthly',
    method: 'cash',
    amount: String(PLANS.monthly.amount),
    externalReference: '',
    note: '',
  });
  const [amountEdited, setAmountEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [recorded, setRecorded] = useState(null); // payment returned by the server
  // One key per attempt: a double click or network retry can't record twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const update = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Keep the amount in step with the plan until staff type their own.
      if (field === 'plan' && !amountEdited) next.amount = String(PLANS[value].amount);
      return next;
    });
    if (field === 'amount') setAmountEdited(true);
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const { payment } = await recordFrontDeskPayment({
        memberId: member.uid,
        plan: form.plan,
        method: form.method,
        amount: Number(form.amount),
        externalReference: form.externalReference.trim(),
        note: form.note.trim(),
        idempotencyKey,
      });
      setRecorded(payment);
      onRecorded?.(payment);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error(error);
        setServerError('Something went wrong. Please try again.');
      } else if (error.status === 0) {
        setServerError(error.message); // keep the key: retrying is safe
      } else {
        setIdempotencyKey(newIdempotencyKey());
        if (error.status === 400 && error.data.field) setErrors({ [error.data.field]: error.message });
        else setServerError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
      errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="record-payment-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 id="record-payment-title" className="text-lg font-bold text-gray-900">Record payment</h2>
          <button onClick={onClose} disabled={submitting} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
            <p className="font-semibold text-gray-900">{member.name}</p>
            <p className="text-gray-500">{member.email}</p>
            <p className={`mt-1 ${current.active ? 'text-emerald-700' : 'text-gray-600'}`}>Now: {describeSubscription(member.subscription, now)}</p>
          </div>

          {recorded ? (
            <div className="text-center py-4" role="status">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-gray-900">Payment recorded</p>
              <p className="text-sm text-gray-500 mb-1">
                {formatNaira(recorded.amount)} · {recorded.planLabel} · {recorded.method === 'transfer' ? 'Bank transfer' : 'Cash'}
              </p>
              <p className="text-sm text-gray-500 font-mono mb-5">{recorded.reference}</p>
              <div className="flex gap-3">
                <Link to={`/receipts/${recorded.id}`} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                  View receipt
                </Link>
                <button onClick={onClose} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Done</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-1">Plan</legend>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(PLANS).map((p) => {
                    const disabled = p.id === 'session' && monthlyActive;
                    return (
                      <label
                        key={p.id}
                        className={`border rounded-lg p-3 text-sm cursor-pointer ${form.plan === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input type="radio" name="plan" value={p.id} className="sr-only" checked={form.plan === p.id} disabled={disabled} onChange={() => update('plan', p.id)} />
                        <span className="block font-semibold text-gray-900">{p.label}</span>
                        <span className="text-gray-500">{formatNaira(p.amount)}</span>
                      </label>
                    );
                  })}
                </div>
                {monthlyActive && <p className="text-xs text-gray-500 mt-1">Monthly is active: recording monthly again adds 30 days.</p>}
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-1">Paid by</legend>
                <div className="flex gap-4 text-sm">
                  {[['cash', 'Cash'], ['transfer', 'Bank transfer']].map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="method" value={value} checked={form.method === value} onChange={() => update('method', value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 block mb-1">Amount received (₦)</span>
                <input inputMode="numeric" value={form.amount} onChange={(e) => update('amount', e.target.value)} className={inputClass('amount')} />
                {errors.amount && <span className="block text-xs text-red-600 mt-1">{errors.amount}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 block mb-1">
                  {form.method === 'transfer' ? 'Transfer reference' : 'Receipt book number (optional)'}
                </span>
                <input value={form.externalReference} onChange={(e) => update('externalReference', e.target.value)} maxLength={60} autoComplete="off" className={inputClass('externalReference')} />
                {errors.externalReference && <span className="block text-xs text-red-600 mt-1">{errors.externalReference}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 block mb-1">Note {Number(form.amount) !== PLANS[form.plan].amount ? '(required)' : '(optional)'}</span>
                <textarea value={form.note} onChange={(e) => update('note', e.target.value)} maxLength={200} rows={2} className={inputClass('note')} />
                {errors.note && <span className="block text-xs text-red-600 mt-1">{errors.note}</span>}
              </label>

              {serverError && (
                <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Recording…' : `Record ${formatNaira(Number(form.amount) || 0)}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
